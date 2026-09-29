export default {
  id: 'physical',
  n: 2,
  domain: 'physical',
  weight: 5,
  title: 'Physical Layer Management',
  blurb: 'The two ways NCP-AII expects you to carve up hardware: BlueField DPUs (operating modes, rshim, BFB installation, mlxconfig, DOCA) and Multi-Instance GPU (profiles, GI/CI lifecycle, persistence and scheduler integration).',
  hours: '2–3 h',
  lessons: [
    /* ------------------------------------------------------------------ */
    {
      id: 'bluefield',
      title: 'Configuring and managing the BlueField platform',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'Objective 2.1 is "configure and manage a BlueField network platform". In practice that means five things: know what a [[bluefield|BlueField DPU]] is, choose its operating mode, reach it (rshim, OOB, BMC), install or recover its OS from a [[bfb|BFB image]], and keep firmware and [[doca|DOCA]] consistent. Only 5% of the exam — but the questions are specific.' },

        { t: 'h2', x: 'What is on the card' },
        { t: 'p', x: 'A BlueField is a [[connectx|ConnectX]] network ASIC fused with a small server: Arm cores, their own DDR memory, eMMC/NVMe boot storage, hardware accelerators (crypto, regex, compression, storage emulation) and — on BlueField-3 — an on-card [[bf-bmc|BMC]]. The Arm complex runs a full Linux (Ubuntu by default) delivered in the BFB, with the DOCA runtime on top.' },
        { t: 'specs', rows: [
          ['Network', 'BlueField-3: up to 400 Gb/s — e.g. 1×400G or 2×200G, InfiniBand (NDR) or Ethernet per port'],
          ['Host interface', 'PCIe Gen5 x16 (BlueField-3); BlueField-2 is 200 Gb/s class on PCIe Gen4'],
          ['Arm subsystem', 'Up to 16 Arm Cortex-A78 cores on BlueField-3, dedicated DDR5, on-board boot storage'],
          ['Management', '1 GbE OOB port (Arm oob_net0, and the on-card BMC on BlueField-3), rshim over PCIe/USB, serial console'],
          ['Software', 'BFB = Arm OS + DOCA runtime (+ firmware in the bundle BFB); host side uses DOCA-Host'],
          ['MST device', '`/dev/mst/mt41692_pciconf0` (BlueField-3), `mt41686_pciconf0` (BlueField-2)'],
        ]},
        { t: 'p', x: 'In a DGX H100/H200 the BlueField-3 DPUs sit on the storage/in-band (north-south) side while ConnectX-7s carry the [[east-west|east-west]] compute fabric. BlueField-3 also ships as a "SuperNIC" variant for Spectrum-X Ethernet compute fabrics — same silicon, tuned for GPU-to-GPU [[roce|RoCE]] traffic.' },

        { t: 'h2', x: 'Operating modes' },
        { t: 'p', x: 'The mode decides who owns the NIC: the host, or the Arm cores. It is stored in NIC non-volatile config (set with [[mlxlink|mlxconfig]]) and only takes effect after a cold reboot / firmware reset. See [Modes of operation](https://docs.nvidia.com/networking/display/bluefieldbsp4110/modes+of+operation).' },
        { t: 'table', head: ['Mode', 'Who controls the data path', 'How it is set', 'Typical use'], rows: [
          ['[[dpu-mode|DPU mode]] (ECPF / embedded) — **default**', 'Arm cores. Host traffic passes through the eSwitch rules the Arm side programs (OVS). Arm sees uplinks p0/p1 and representors pf0hpf, pf0vfN', '`INTERNAL_CPU_MODEL=1` (EMBEDDED_CPU), `INTERNAL_CPU_OFFLOAD_ENGINE=0`', 'OVS offload, storage emulation, security isolation, DOCA services'],
          ['[[zero-trust|Zero-trust / restricted]]', 'Arm cores, and the host additionally loses the right to reflash or reconfigure the card', 'From the Arm side: `mlxprivhost -d <dev> r` (restrict) / `p` (privileged); or via the BlueField BMC', 'Bare-metal cloud tenants, untrusted hosts'],
          ['[[nic-mode|NIC mode]]', 'Host, like a plain ConnectX; the Arm cores do not own the data path', 'BlueField-3: `INTERNAL_CPU_OFFLOAD_ENGINE=1`', 'Pure networking with no Arm-side services; simplest host driver model'],
          ['[[separated-host|Separated host]] (legacy)', 'Host and Arm are symmetric peers with their own PFs/MACs', '`INTERNAL_CPU_MODEL=0`', 'Historical; deprecated in current BSPs'],
        ]},
        { t: 'code', lang: 'bash', title: 'Query and change the mode (from the host)', x: `sudo mst start
sudo mst status -v                          # find /dev/mst/mt41692_pciconf0
sudo mlxconfig -d /dev/mst/mt41692_pciconf0 q | grep -E "INTERNAL_CPU|LINK_TYPE"

# BlueField-3 → NIC mode
sudo mlxconfig -d /dev/mst/mt41692_pciconf0 s INTERNAL_CPU_OFFLOAD_ENGINE=1
# back to DPU mode
sudo mlxconfig -d /dev/mst/mt41692_pciconf0 s INTERNAL_CPU_OFFLOAD_ENGINE=0

# port protocol: 1 = InfiniBand, 2 = Ethernet
sudo mlxconfig -d /dev/mst/mt41692_pciconf0 s LINK_TYPE_P1=2 LINK_TYPE_P2=2

# new values show under "Next Boot" until the card is reset
sudo mlxfwreset -d /dev/mst/mt41692_pciconf0 r   # or a full power cycle` },
        { t: 'callout', kind: 'trap', title: 'mlxconfig changes are not live', x: [
          '`mlxconfig q` shows **Default / Current / Next Boot** columns. A value you just set appears only under Next Boot until the firmware is reset (`mlxfwreset`) or the server is **cold** power-cycled — a warm OS reboot is not always enough for mode changes.',
          'A DPU that "still behaves like DPU mode after I set NIC mode" was almost always not power-cycled.',
        ]},

        { t: 'h2', x: 'Three ways to reach a DPU' },
        { t: 'vs', cards: [
          { h: 'rshim (from the host or BMC)', items: [
            '`rshim` driver/service on the host creates `/dev/rshim0/`',
            '`boot` — write a BFB here to install the OS',
            '`console` — Arm serial console (`screen /dev/rshim0/console 115200`)',
            '`tmfifo_net0` — virtual Ethernet: host 192.168.100.1 ↔ DPU 192.168.100.2',
            'Works even when the Arm OS is broken — the recovery path',
          ]},
          { h: '1 GbE OOB port', items: [
            'Physical RJ45 on the card, cabled to the [[oob|OOB]] network',
            'Appears in the Arm OS as `oob_net0`; gets DHCP by default',
            'SSH to the Arm OS as user `ubuntu`',
            'On BlueField-3 it also carries the on-card BMC',
          ]},
          { h: 'BlueField BMC', items: [
            'OpenBMC with [[redfish|Redfish]] / [[ipmi|IPMI]]',
            'Power-cycle the Arm complex, read sensors, update firmware',
            'Owns its own rshim — can install a BFB without the host OS',
            'Factory credentials must be changed at first login',
          ]},
        ]},
        { t: 'callout', kind: 'warn', title: 'One rshim owner at a time', x: 'The rshim can be driven by the host **or** by the BlueField BMC, not both. If `bfb-install` from the host fails because the device is busy, check whether the BMC (or another host process) currently holds the rshim, and release it before retrying.' },

        { t: 'h2', x: 'Installing the DPU OS from a BFB' },
        { t: 'p', x: 'The [[bfb|BFB]] is the whole Arm software image in one file: Ubuntu for Arm, the DOCA runtime and drivers, and — in the "bundle" BFB — NIC, BMC and CEC firmware. Installing a newer BFB is both the upgrade path and the recovery path.' },
        { t: 'flow', steps: [
          { b: 'Host prerequisites', s: 'Install DOCA-Host (or at least the `rshim` package) and MFT; `systemctl status rshim`; confirm `/dev/rshim0` exists.' },
          { b: 'Prepare bf.cfg (optional)', s: 'Put a hashed `ubuntu_PASSWORD` and any network/BMC settings in a [[bf-cfg|bf.cfg]].' },
          { b: 'Push the image', s: '`bfb-install --bfb <image>.bfb --config bf.cfg --rshim rshim0`, or `cat <image>.bfb > /dev/rshim0/boot`.' },
          { b: 'Watch the console', s: 'Follow progress on `/dev/rshim0/console` (or the installer\'s own output); the DPU reboots into the new OS.' },
          { b: 'Firmware reset if prompted', s: 'If the bundle updated NIC firmware, apply it with `mlxfwreset` or a cold power cycle of the host.' },
          { b: 'Verify', s: 'SSH over `oob_net0` or `tmfifo_net0`; check `/etc/mlnx-release`, `flint -d <dev> q`, and `ovs-vsctl show`.' },
        ]},
        { t: 'code', lang: 'bash', title: 'Host-side BFB install with preset credentials', x: `# hashed password for the Arm "ubuntu" user
openssl passwd -1                       # enter the password, copy the hash

cat > bf.cfg <<'EOF'
ubuntu_PASSWORD='$1$abcd$...............'
EOF

sudo bfb-install --bfb bf-bundle-<version>_ubuntu-22.04_prod.bfb \\
                 --config bf.cfg --rshim rshim0

# optional: watch the Arm console in another terminal
sudo screen /dev/rshim0/console 115200` },
        { t: 'p', x: 'Without a bf.cfg the Arm OS boots with the default `ubuntu` / `ubuntu` credentials and forces a password change at first login — fine for one card, painful for a SuperPOD. On BlueField-3 you can instead push the BFB **from the BlueField BMC** over Redfish (the BMC fetches the file and writes it through its own rshim), which is useful when the host OS is not installed yet or belongs to a tenant: see [Deploying DPU OS using BFB from BMC](https://docs.nvidia.com/networking/display/bluefielddpuosv380/deploying+dpu+os+using+bfb+from+bmc).' },
        { t: 'callout', kind: 'exam', title: 'Pick the install path from the stem', x: [
          '"Host OS is up, DOCA-Host installed" → `bfb-install` over the host rshim.',
          '"Host OS not installed / tenant owns the host / do it remotely" → install from the **BlueField BMC** via Redfish.',
          '"Set the Arm password on hundreds of DPUs without logging in" → hashed `ubuntu_PASSWORD` in **bf.cfg**.',
          '"Arm OS corrupted, SSH dead" → rshim console to diagnose, then re-push the BFB — no card replacement needed.',
        ]},

        { t: 'h2', x: 'Firmware on BlueField' },
        { t: 'p', x: 'The NIC firmware on the BlueField is managed with the same MFT tools as ConnectX ([[mst|mst]], `flint`, `mlxfwmanager`, `mlxconfig`), from either the host or the Arm OS. Keep firmware, BFB/DOCA version on the Arm side and DOCA-Host on the host aligned with a single DOCA release — mismatches are a common source of odd driver behaviour.' },
        { t: 'table', head: ['Task', 'Command'], rows: [
          ['Load MFT access and list devices', '`mst start` · `mst status -v`'],
          ['Query firmware version and PSID', '`flint -d /dev/mst/mt41692_pciconf0 q`'],
          ['Query / update all NVIDIA adapters', '`mlxfwmanager --query` · `mlxfwmanager -u -i fw.bin` (or `--online`)'],
          ['Burn a specific image', '`flint -d <dev> -i fw.bin burn`'],
          ['Activate new firmware without reboot', '`mlxfwreset -d <dev> r` (when supported)'],
          ['Read / set NV parameters', '`mlxconfig -d <dev> q` · `mlxconfig -d <dev> s KEY=VAL`'],
          ['Link / signal quality', '`mlxlink -d <dev> -p 1 -c`'],
        ]},
        { t: 'callout', kind: 'tip', title: 'Bundle BFB vs. firmware-only update', x: 'A bundle BFB updates the NIC firmware as part of the OS install. If you only need new NIC firmware, `mlxfwmanager`/`flint` from the host is faster and does not touch the Arm OS. Either way, the new firmware is inactive until a firmware reset or cold boot.' },

        { t: 'h2', x: 'Inside the Arm OS (DPU mode)' },
        { t: 'code', lang: 'bash', title: 'What you see after SSH to the DPU', x: `ubuntu@dpu:~$ ip -br link
oob_net0   UP     # 1 GbE management
tmfifo_net0 UP    # rshim link to the host
p0 p1      UP     # physical uplinks
pf0hpf pf1hpf     # representors of the host PFs
pf0vf0 ...        # representors of host VFs (if SR-IOV enabled on host)

ubuntu@dpu:~$ sudo ovs-vsctl show        # default bridges ovsbr1 / ovsbr2
ubuntu@dpu:~$ sudo ovs-vsctl get Open_vSwitch . other_config:hw-offload
"true"` },
        { t: 'p', x: 'Each host function has a representor on the Arm side; OVS connects representors to uplinks, and [[ovs-offload|ASAP² hardware offload]] pushes established flows into the eSwitch so packets are forwarded at line rate without touching the Arm cores or the host CPU.' },

        { t: 'h2', x: 'Why deploy a DPU at all' },
        { t: 'table', head: ['Use case', 'What the DPU does', 'Mode'], rows: [
          ['Network virtualisation / OVS offload', 'Runs OVS on Arm, offloads flows, VXLAN/Geneve encap, ACLs', 'DPU'],
          ['Storage offload', 'NVMe-oF / NVMe emulation (SNAP) — the host sees a local NVMe device backed by remote storage; storage vendors such as VAST run client services on the DPU', 'DPU'],
          ['Security isolation', 'Firewalling, IPsec/TLS crypto offload, telemetry; policy lives outside the host\'s trust domain', 'DPU / zero-trust'],
          ['Bare-metal multi-tenancy', 'Provider manages the network from the Arm/BMC side; tenant cannot reflash or reconfigure', 'Zero-trust'],
          ['Plain high-speed NIC', 'Just 400G networking to the host', 'NIC'],
        ]},
        { t: 'callout', kind: 'exam', title: 'BlueField one-liners', x: [
          'Default mode = **DPU (embedded / ECPF)**. NIC mode on BlueField-3 = `INTERNAL_CPU_OFFLOAD_ENGINE=1`.',
          'Host can\'t touch the card = **zero-trust / restricted**, set from the Arm side or BMC.',
          'Install/recover the OS = **BFB via rshim** (`bfb-install`) or **from the BlueField BMC**.',
          'Default Arm login `ubuntu`/`ubuntu`, override with **bf.cfg**.',
          'Every mlxconfig change needs a **firmware reset / cold boot**.',
        ]},
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'mig',
      title: 'Configuring MIG for AI and HPC',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'Objective 2.2 is "configure MIG for AI and HPC workloads". [[mig|Multi-Instance GPU]] splits one data-center GPU into as many as seven hardware-isolated GPUs. The exam tests the lifecycle (enable → GI → CI → use → destroy), the profile names, what survives a reboot, and how Slurm and Kubernetes see the pieces. Reference: the [MIG User Guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/index.html).' },

        { t: 'h2', x: 'What MIG partitions' },
        { t: 'p', x: 'A MIG-capable GPU is built from 7 compute slices (groups of SMs) and 8 memory slices (memory plus L2 cache slices and memory controllers). A [[gpu-instance|GPU instance (GI)]] owns a fixed set of both, so memory capacity, memory bandwidth and L2 are **dedicated** — one tenant cannot starve another. Inside a GI you create one or more [[compute-instance|compute instances (CI)]]; the CI is the thing CUDA sees as a device.' },
        { t: 'flow', steps: [
          { b: 'Physical GPU', s: 'MIG mode enabled on e.g. an H100 80GB.' },
          { b: 'GPU instance', s: 'Memory, L2 and bandwidth isolation boundary — e.g. 3g.40gb.' },
          { b: 'Compute instance', s: 'SMs inside the GI; one CI using the whole GI is the common case.' },
          { b: 'MIG device', s: 'Appears in `nvidia-smi -L` with a `MIG-<uuid>`; one CUDA process targets one MIG device.' },
        ]},

        { t: 'h2', x: 'Which GPUs support MIG' },
        { t: 'table', head: ['GPU', 'Max instances', 'Example profiles'], rows: [
          ['A100 40GB / 80GB', '7', '1g.5gb … 7g.40gb / 1g.10gb … 7g.80gb'],
          ['A30 24GB', '4', '1g.6gb, 2g.12gb, 4g.24gb'],
          ['H100 80GB', '7', '1g.10gb, 1g.20gb, 2g.20gb, 3g.40gb, 4g.40gb, 7g.80gb'],
          ['H200 141GB', '7', 'Same slice structure with larger memory per slice (e.g. 1g.18gb … 7g.141gb)'],
          ['B200', '7', 'Same slice structure, larger memory per slice'],
        ]},
        { t: 'callout', kind: 'trap', title: 'Not every NVIDIA GPU does MIG', x: 'MIG is a data-center feature of A100, A30, H100, H200, B200 and later. Consumer GeForce, older V100/T4 and most workstation cards do not support it — a question offering MIG on a V100 is a distractor.' },

        { t: 'h3', x: 'H100 80GB profiles' },
        { t: 'table', head: ['Profile', 'Profile ID', 'Compute slices', 'Memory', 'Max per GPU'], rows: [
          ['1g.10gb', '19', '1/7', '10 GB', '7'],
          ['1g.20gb', '15', '1/7', '20 GB', '4'],
          ['2g.20gb', '14', '2/7', '20 GB', '3'],
          ['3g.40gb', '9', '3/7', '40 GB', '2'],
          ['4g.40gb', '5', '4/7', '40 GB', '1'],
          ['7g.80gb', '0', '7/7', '80 GB', '1'],
        ]},
        { t: 'p', x: 'Read a profile literally: `<n>g` is compute slices out of seven, `<m>gb` is dedicated memory. Profile IDs differ between GPU models — always read them from `nvidia-smi mig -lgip` on the actual system rather than memorising them. Placement rules also apply: e.g. a 4g.40gb plus a 3g.40gb fills an H100, but you cannot then add a 1g.10gb. `nvidia-smi mig -lgipp` shows the valid placements.' },

        { t: 'h2', x: 'Step 1 — enable MIG mode' },
        { t: 'code', lang: 'bash', title: 'Enable MIG on GPU 0', x: `# nothing may be using the GPU: stop jobs, DCGM/dcgm-exporter, monitoring agents
sudo systemctl stop nvidia-dcgm dcgm-exporter 2>/dev/null

sudo nvidia-smi -i 0 -mig 1
# "Enabled MIG Mode for GPU 00000000:18:00.0"
# If it reports "pending" → reset the GPU (or reboot)
sudo nvidia-smi -i 0 -r

nvidia-smi -i 0 --query-gpu=mig.mode.current,mig.mode.pending --format=csv` },
        { t: 'callout', kind: 'warn', title: 'Enabling MIG needs an idle GPU', x: [
          'The command fails or stays **pending** if any process holds the GPU. On a cluster, **drain** the node first ([[slurm|Slurm]]: `scontrol update nodename=X state=drain reason="MIG reconfig"`; Kubernetes: cordon/drain).',
          'On NVSwitch systems (HGX/DGX) a GPU reset may require all GPUs to be idle and [[fabric-manager|Fabric Manager]] considerations apply; a node reboot is the blunt fallback.',
          'The **MIG mode** flag itself persists across reboots; the **instances** you create next do not.',
        ]},

        { t: 'h2', x: 'Step 2 — create GPU and compute instances' },
        { t: 'code', lang: 'bash', title: 'Create, inspect, use', x: `nvidia-smi mig -lgip                 # list GI profiles (ID, name, free/total)
nvidia-smi mig -lgipp                # list valid placements

# two 3g.40gb GIs, each with a default full-size CI (-C)
sudo nvidia-smi mig -i 0 -cgi 9,9 -C
# same thing by name
sudo nvidia-smi mig -i 0 -cgi 3g.40gb,3g.40gb -C

nvidia-smi mig -lgi                  # list GPU instances
nvidia-smi mig -lci                  # list compute instances
nvidia-smi -L                        # MIG devices and their MIG-<uuid>

# advanced: create CIs yourself inside GI 1
nvidia-smi mig -i 0 -gi 1 -lcip      # CI profiles available in that GI
sudo nvidia-smi mig -i 0 -gi 1 -cci 0,0,0   # e.g. three 1-slice CIs sharing 40 GB

# run on one MIG device
CUDA_VISIBLE_DEVICES=MIG-4b1f...-... python infer.py` },
        { t: 'p', x: 'Without `-C`, `-cgi` creates only the GPU instance — there is nothing CUDA can use until you add a compute instance with `-cci`. With `-C` a default CI spanning the whole GI is created in one step, which is what you want in nearly every case.' },

        { t: 'h2', x: 'Step 3 — tear down (order matters)' },
        { t: 'code', lang: 'bash', title: 'Destroy CIs, then GIs, then disable MIG', x: `sudo nvidia-smi mig -i 0 -dci        # destroy all compute instances
sudo nvidia-smi mig -i 0 -dgi        # then all GPU instances
sudo nvidia-smi -i 0 -mig 0          # optionally leave MIG mode (idle GPU, may need reset)` },
        { t: 'callout', kind: 'trap', title: 'CI before GI', x: 'Creation is GI → CI; destruction is the reverse: **CI → GI**. Trying `-dgi` while CIs still exist fails with an "in use" style error. Destroying anything also fails while a process is running on that instance.' },

        { t: 'h2', x: 'Persistence: surviving a reboot' },
        { t: 'p', x: 'GPU and compute instances are held in driver state and are **gone after a reboot or driver reload**. Production clusters therefore describe the layout declaratively and re-apply it at boot with [[mig-parted|nvidia-mig-parted]] (a systemd unit on bare metal) or the GPU Operator\'s MIG Manager on Kubernetes.' },
        { t: 'code', lang: 'yaml', title: 'mig-parted config (excerpt)', x: `version: v1
mig-configs:
  all-disabled:
    - devices: all
      mig-enabled: false
  all-1g.10gb:
    - devices: all
      mig-enabled: true
      mig-devices:
        "1g.10gb": 7
  inference-mix:
    - devices: [0,1,2,3]
      mig-enabled: true
      mig-devices: { "3g.40gb": 2 }
    - devices: [4,5,6,7]
      mig-enabled: false

# apply:  sudo nvidia-mig-parted apply -f config.yaml -c all-1g.10gb
# K8s:    kubectl label node gpu01 nvidia.com/mig.config=all-1g.10gb --overwrite` },

        { t: 'h2', x: 'MIG under schedulers' },
        { t: 'table', head: ['Scheduler', 'How MIG devices appear', 'How a job asks for one'], rows: [
          ['Bare metal / Docker', 'MIG devices by UUID (`nvidia-smi -L`)', '`CUDA_VISIBLE_DEVICES=MIG-<uuid>` or `docker run --gpus \'"device=0:1"\'`'],
          ['[[slurm|Slurm]]', 'GRES of type = profile, auto-detected with `AutoDetect=nvml` in gres.conf', '`--gres=gpu:1g.10gb:1`'],
          ['Kubernetes, [[mig-strategy|single strategy]]', 'All MIG devices on the node are identical and advertised as `nvidia.com/gpu`', '`resources.limits: nvidia.com/gpu: 1`'],
          ['Kubernetes, [[mig-strategy|mixed strategy]]', 'Each profile is its own resource', '`nvidia.com/mig-3g.40gb: 1`'],
        ]},
        { t: 'callout', kind: 'exam', title: 'Single vs. mixed', x: 'If a node carries **different** profiles (e.g. 3g.40gb and 1g.10gb) you need the **mixed** strategy — single assumes every MIG device on the node is the same size. Changing the layout on a K8s node = relabel `nvidia.com/mig.config`; the MIG Manager drains GPU pods, reconfigures and brings them back.' },

        { t: 'h2', x: 'MIG vs. time-slicing vs. vGPU' },
        { t: 'table', head: ['', '[[mig|MIG]]', '[[time-slicing|Time-slicing]]', '[[vgpu|vGPU]]'], rows: [
          ['Isolation', 'Hardware: dedicated SMs, memory, L2, bandwidth; faults contained per instance', 'None — shared memory, one fault can affect all', 'VM-level; MIG-backed vGPU adds hardware isolation'],
          ['QoS', 'Predictable, guaranteed slice', 'Best effort, contention', 'Scheduler-defined per VM'],
          ['Granularity', 'Fixed profiles, max 7', 'Any number of replicas', 'Profiles per VM'],
          ['Consumer', 'Processes / containers', 'Processes / containers', 'Virtual machines (licensed)'],
        ]},

        { t: 'h2', x: 'AI vs. HPC: when MIG helps' },
        { t: 'vs', cards: [
          { h: 'Good fit', items: [
            'Inference serving of small/medium models — many right-sized instances per GPU',
            'Jupyter / dev notebooks and CI jobs that barely use a full GPU',
            'Multi-tenant clusters that need guaranteed QoS and fault isolation',
            'HPC throughput workloads of many small, independent single-GPU jobs',
          ]},
          { h: 'Poor fit', items: [
            'Large-model training that needs the whole GPU and [[nvlink|NVLink]]',
            'Multi-GPU jobs using [[nccl|NCCL]] across instances — no P2P between MIG devices',
            'Workloads that need graphics APIs or full-GPU profiling',
            'Jobs whose size varies minute to minute (reconfiguring requires idle GPUs)',
          ]},
        ]},
        { t: 'callout', kind: 'trap', title: 'No NVLink/P2P inside MIG', x: 'MIG instances do not support GPU peer-to-peer (neither NVLink nor PCIe P2P). A CUDA process sees only one MIG device, so a job cannot span two instances with fast GPU-to-GPU communication. Multi-GPU training belongs on full, non-MIG GPUs.' },
        { t: 'callout', kind: 'exam', title: 'MIG one-liners', x: [
          'Enable: `nvidia-smi -i 0 -mig 1` on an **idle** GPU, reset if pending.',
          'Create: `nvidia-smi mig -cgi <ids|names> -C`; list: `-lgip`, `-lgi`, `-lci`, `nvidia-smi -L`.',
          'Destroy: `-dci` then `-dgi`.',
          'Instances are **not persistent** → nvidia-mig-parted / GPU Operator MIG Manager.',
          'K8s: identical profiles → **single**; mixed profiles → **mixed**. Slurm: `--gres=gpu:<profile>:N`.',
        ]},
      ],
    },
  ],

  quiz: [
    { id: 'p01', domain: 'physical',
      scenario: 'A cloud provider rents bare-metal DGX nodes to tenants who get root on the host OS. The provider must keep control of the BlueField-3 network policy and prevent tenants from reflashing or reconfiguring the DPU, while tenants still get full network connectivity.',
      q: 'Which BlueField configuration meets the requirement?',
      opts: [
        'NIC mode, with mlxconfig locked by a BIOS password',
        'Separated host mode, so the tenant and the Arm cores each get their own PF',
        'DPU mode with default host privileges, and OVS rules on the Arm side',
        'DPU mode with the host restricted (zero-trust), managed from the Arm/OOB side or BlueField BMC',
      ],
      a: 3,
      why: '**Zero-trust (restricted) mode** is DPU mode in which the host loses the right to burn firmware, change mlxconfig parameters or alter eSwitch rules. It is set from the Arm side (`mlxprivhost … r`) or via the BMC, so the provider keeps management control while the tenant keeps connectivity.',
      distract: '**NIC mode** gives the host control of the card — the opposite of the goal, and a BIOS password does not protect mlxconfig. **Separated host** is legacy and gives the host independent functions. **Default DPU mode** still lets a privileged host reconfigure the card.' },

    { id: 'p02', domain: 'physical',
      scenario: 'An engineer runs `mlxconfig -d /dev/mst/mt41692_pciconf0 s INTERNAL_CPU_OFFLOAD_ENGINE=1` on a host with a BlueField-3, then reboots the OS with `reboot`. `mlxconfig q` still shows the old value under "Current" and the card still behaves as a DPU.',
      q: 'What is the most likely fix?',
      opts: [
        'Perform a firmware reset (mlxfwreset) or a full cold power cycle of the server',
        'Re-run the command with LINK_TYPE_P1=1 to apply it',
        'Reinstall the BFB image so the Arm OS picks up the change',
        'Restart the rshim service on the host',
      ],
      a: 0,
      why: 'mlxconfig writes the **Next Boot** value; it becomes Current only after the NIC firmware restarts — `mlxfwreset` or a cold power cycle. A warm OS reboot does not necessarily reset the adapter firmware, so the mode change stays pending.',
      distract: '**LINK_TYPE** selects InfiniBand vs. Ethernet and is unrelated. **Reinstalling the BFB** changes the Arm OS, not the pending NV config activation. **rshim** is a management channel and has no role in applying mlxconfig values.' },

    { id: 'p03', domain: 'physical',
      scenario: 'A BlueField-3 DPU\'s Arm OS no longer boots after a failed package upgrade. SSH over oob_net0 times out. The host OS is healthy and has DOCA-Host installed.',
      q: 'What is the recommended recovery path?',
      opts: [
        'RMA the DPU, as the Arm boot storage is corrupted',
        'Flash new NIC firmware with flint, which also restores the Arm OS',
        'Re-install the OS by pushing a BFB over the host rshim interface with bfb-install',
        'Switch the card to NIC mode and reboot so the Arm OS is bypassed permanently',
      ],
      a: 2,
      why: 'rshim works independently of the Arm OS: `bfb-install --bfb <image>.bfb --rshim rshim0` (optionally with bf.cfg) rewrites the Arm OS and DOCA runtime. `/dev/rshim0/console` can be used first to see what failed.',
      distract: 'A software failure is not grounds for **RMA**. **flint** burns NIC firmware only; it does not reinstall the Arm OS. **NIC mode** avoids the problem instead of fixing it and loses every DPU service.' },

    { id: 'p04', domain: 'physical',
      scenario: 'A team is re-imaging 256 BlueField-3 DPUs with a new BFB. They want each Arm OS to come up with a known password for the ubuntu user, without anyone logging in to each DPU to answer the first-login password prompt.',
      q: 'How should they do this?',
      opts: [
        'Log in once over rshim console and copy /etc/shadow to the other DPUs',
        'Pass a bf.cfg containing a hashed ubuntu_PASSWORD to bfb-install',
        'Set the password with mlxconfig before installing the BFB',
        'Set the password in the BlueField BMC; the Arm OS inherits BMC credentials',
      ],
      a: 1,
      why: '**bf.cfg** customises a BFB installation; `ubuntu_PASSWORD` takes a hashed password (e.g. from `openssl passwd -1`) and is applied at install time, so there is no forced first-login change.',
      distract: 'Copying **/etc/shadow** is manual and unsupported. **mlxconfig** sets NIC NV parameters, not OS users. The **BMC** has its own separate credentials that the Arm OS does not inherit.' },

    { id: 'p05', domain: 'physical',
      scenario: 'An administrator on an H100 80GB node runs `sudo nvidia-smi -i 0 -mig 1`. The output says MIG mode is enabled but "pending", and nvidia-smi shows a dcgm-exporter process on GPU 0.',
      q: 'What must happen before GPU instances can be created?',
      opts: [
        'Stop the processes using the GPU and reset GPU 0 (or reboot) so the pending mode becomes current',
        'Run nvidia-smi mig -cgi 19 -C; creating an instance activates the pending mode',
        'Enable persistence mode; MIG activates when nvidia-persistenced restarts',
        'Install nvidia-mig-parted; MIG mode cannot be enabled with nvidia-smi on H100',
      ],
      a: 0,
      why: 'Enabling MIG needs an idle GPU and a GPU reset. With a process holding the GPU the change stays **pending**; stop monitoring agents and jobs (drain the node on a cluster), then `nvidia-smi -i 0 -r` or reboot.',
      distract: '**Creating a GI** fails while MIG mode is not current. **Persistence mode** does not activate MIG. **mig-parted** is convenient but nvidia-smi fully supports enabling MIG on H100.' },

    { id: 'p06', domain: 'physical',
      scenario: 'A Kubernetes cluster runs the NVIDIA GPU Operator. The platform team wants each H100 on node gpu07 split into two 3g.40gb instances and one 1g.10gb instance (the mixed layout is defined in the MIG Manager config), and wants that layout to come back automatically after reboots.',
      q: 'Which approach is correct?',
      opts: [
        'SSH to the node, run nvidia-smi mig -cgi manually, and use the single MIG strategy',
        'Use GPU time-slicing with three replicas per GPU',
        'Label the node with nvidia.com/mig.config=<layout> and use the mixed MIG strategy',
        'Enable vGPU on the node and create three vGPU profiles per GPU',
      ],
      a: 2,
      why: 'The GPU Operator\'s **MIG Manager** applies the layout named in the `nvidia.com/mig.config` label (via nvidia-mig-parted) and re-applies it after reboots. Because the node has **different profiles**, the **mixed** strategy is needed so pods can request `nvidia.com/mig-3g.40gb` or `nvidia.com/mig-1g.10gb`.',
      distract: 'Manual **nvidia-smi** instances are lost at reboot, and the **single** strategy assumes identical profiles. **Time-slicing** gives no memory isolation. **vGPU** targets virtual machines, not K8s pods on bare metal.' },

    { id: 'p07', domain: 'physical',
      scenario: 'An administrator wants to reconfigure GPU 0 from two 3g.40gb instances to seven 1g.10gb instances. No jobs are running on the GPU.',
      q: 'Which command sequence is correct?',
      opts: [
        'nvidia-smi mig -dgi; nvidia-smi mig -dci; nvidia-smi mig -cgi 19,19,19,19,19,19,19 -C',
        'nvidia-smi -i 0 -mig 0; nvidia-smi mig -cgi 1g.10gb -C',
        'nvidia-smi mig -cgi 19,19,19,19,19,19,19 -C (existing instances are replaced automatically)',
        'nvidia-smi mig -i 0 -dci; nvidia-smi mig -i 0 -dgi; nvidia-smi mig -i 0 -cgi 19,19,19,19,19,19,19 -C',
      ],
      a: 3,
      why: 'Tear-down is the reverse of creation: **compute instances first (-dci), then GPU instances (-dgi)**. Then create seven 1g.10gb GIs (profile ID 19 on H100 80GB) each with a default CI (-C).',
      distract: 'Destroying **GIs before CIs** fails because CIs still exist. **Disabling MIG** removes MIG entirely, so -cgi would then fail, and it creates only one instance. New instances **do not** replace existing ones — the slices are simply not free.' },

    { id: 'p08', domain: 'physical',
      scenario: 'A researcher on a MIG-enabled H100 node requests two 3g.40gb instances for a data-parallel PyTorch job and complains that NCCL all-reduce between them is extremely slow or fails to use NVLink.',
      q: 'What explains this?',
      opts: [
        'Fabric Manager is stopped, so NVLink is disabled on the node',
        'MIG instances do not support GPU peer-to-peer over NVLink or PCIe; multi-GPU jobs should use full non-MIG GPUs',
        'The job must set CUDA_VISIBLE_DEVICES to the physical GPU index instead of MIG UUIDs',
        'The 3g.40gb profile lacks NVLink; the 4g.40gb profile would enable it',
      ],
      a: 1,
      why: 'MIG isolates instances in hardware, and **P2P (NVLink or PCIe) is not available between MIG devices** — a CUDA process can only use one MIG device. Jobs that need fast GPU-to-GPU collectives belong on whole GPUs without MIG.',
      distract: '**Fabric Manager** matters for full-GPU NVSwitch systems but does not add P2P to MIG. Using the **physical index** does not bypass MIG. **No MIG profile** enables NVLink between instances.' },
  ],
}
