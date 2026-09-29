export default {
  id: 'controlplane',
  n: 3,
  domain: 'controlplane',
  weight: 19,
  title: 'Control Plane Installation and Configuration',
  blurb: 'From bare head node to a working GPU cluster: install Base Command Manager and make it highly available, provision the OS through software images and categories, deploy Slurm with Enroot/Pyxis, and get GPU drivers, DOCA-Host, the Container Toolkit and the NGC CLI right.',
  hours: '4–5 h',
  lessons: [
    /* ------------------------------------------------------------------ */
    {
      id: 'bcm-ha',
      title: 'Installing Base Command Manager and configuring HA',
      minutes: 15,
      blocks: [
        { t: 'lede', x: 'Objective 3.1 is "install Base Command Manager (BCM), configure and verify HA". Expect questions on the order of operations, which network does what, which cmsh mode holds which object, and how to prove that a secondary head node will really take over.' },

        { t: 'h2', x: 'What BCM is responsible for' },
        { t: 'p', x: '[[bcm|Base Command Manager]] turns a rack of servers into a managed cluster. One [[head-node|head node]] runs **CMDaemon** (the management daemon) and a cluster database; every other node is provisioned from it over the network. Administrators drive it through [[cmsh|cmsh]] or the [[base-view|Base View]] web GUI — two front-ends to the same daemon.' },
        { t: 'table', head: ['BCM object', 'What it represents', 'cmsh mode'], rows: [
          ['Device', 'A single node, switch, PDU or head node — MAC, IPs, interfaces, power control', '`device`'],
          ['[[bcm-category|Category]]', 'A group of nodes sharing an image, roles, mounts and services', '`category`'],
          ['[[software-image|Software image]]', 'A root file system under `/cm/images/<name>` that is copied to nodes', '`softwareimage`'],
          ['Network', 'An IP subnet: internalnet, externalnet, ipminet, ibnet…', '`network`'],
          ['Workload manager', 'Slurm / PBS / Kubernetes instances deployed by BCM', '`wlm` (and `kubernetes`)'],
          ['Cluster-wide settings', 'License, name servers, time servers, admin e-mail', '`main` / `partition`'],
        ]},

        { t: 'h2', x: 'Installing the head node' },
        { t: 'flow', steps: [
          { b: 'Prepare hardware', s: 'Head node with enough disk for several images (each is a full root FS), BMC reachable on the [[oob|OOB]] network, NICs cabled to the internal (provisioning) and external networks.' },
          { b: 'Boot the BCM ISO', s: 'Mount it through the [[bmc|BMC]] virtual media or USB. The installer is graphical (text mode is available).' },
          { b: 'Accept licences, pick the base distro', s: 'BCM ships as an ISO per base OS (Ubuntu or RHEL-family). The head node and the default image use that distro.' },
          { b: 'Choose the network topology', s: 'Type 1 (nodes on a private internalnet behind the head node — the usual choice), Type 2 (nodes on a routed/public network) or Type 3 (routed internal networks).' },
          { b: 'Define networks and interfaces', s: 'Map head-node NICs to [[bcm-networks|externalnet, internalnet and ipminet]]; set addresses, domain, DNS and gateway.' },
          { b: 'Disk layout, time zone, root password', s: 'Choose a partitioning template; NTP matters later for Slurm/munge and HA.' },
          { b: 'Install and reboot', s: 'The installer writes the head node plus a `default-image` and a `default` category.' },
          { b: 'License the cluster', s: 'Run `request-license` (or install a supplied licence); check it with `cmsh -c "main; licenseinfo"`.' },
        ]},

        { t: 'h3', x: 'The three default networks' },
        { t: 'table', head: ['Network', 'Default subnet', 'Carries'], rows: [
          ['`internalnet`', '10.141.0.0/16', 'PXE/DHCP/TFTP provisioning, node management, NFS for /cm/shared and /home'],
          ['`ipminet`', '10.148.0.0/16', 'BMC traffic — BCM uses it for power on/off/reset and sensor data ([[ipmi|IPMI]]/[[redfish|Redfish]])'],
          ['`externalnet`', 'site network (DHCP or static)', 'User logins and outbound access; normally only the head node(s) sit on it'],
        ]},
        { t: 'callout', kind: 'exam', title: 'Which network provisions the nodes?', x: 'Compute nodes PXE-boot and receive their image over **internalnet**. BCM switches nodes on and off through **ipminet**. The high-speed [[infiniband|InfiniBand]] compute fabric is not a provisioning network — it is added later as an extra network (for example `ibnet`) with `ib0`-style interfaces.' },

        { t: 'h2', x: 'Provisioning compute nodes' },
        { t: 'p', x: 'A node that powers on with PXE first in its boot order DHCPs from the head node, loads the [[node-installer|node-installer]], is identified (by MAC address, or by switch port if switch-port identification is configured), and then receives its category\'s [[software-image|software image]] via rsync. The **install mode** decides how much is copied.' },
        { t: 'table', head: ['Install mode', 'Behaviour', 'Use it when'], rows: [
          ['AUTO (default)', 'Full install if the disk layout is new/changed, otherwise a sync', 'Normal operation'],
          ['FULL', 'Repartition, reformat and copy the whole image', 'Disk replaced, corrupted root FS, "start clean"'],
          ['MAIN', 'Stop in the installer so an admin can decide', 'Debugging a node that fails provisioning'],
          ['NOSYNC', 'Boot the local disk without syncing', 'Keeping local changes — rarely right in production'],
        ]},
        { t: 'code', lang: 'bash', title: 'Everyday cmsh — interactive and one-shot', x: `# One-shot commands
cmsh -c "device; list"                       # all devices with status
cmsh -c "device; status"                     # UP / DOWN / INSTALLING per node
cmsh -c "softwareimage; list"
cmsh -c "category; list"

# Interactive: create a DGX image and category
cmsh
[head]% softwareimage
[head->softwareimage]% clone default-image dgx-image
[head->softwareimage*[dgx-image*]]% commit
[head->softwareimage[dgx-image]]% category
[head->category]% clone default dgx-h100
[head->category*[dgx-h100*]]% set softwareimage dgx-image
[head->category*[dgx-h100*]]% commit

# Move nodes into it and power-cycle them over ipminet
[head->category[dgx-h100]]% device
[head->device]% foreach -n dgx001..dgx032 (set category dgx-h100)
[head->device*]% commit
[head->device]% power reset -n dgx001..dgx032` },
        { t: 'callout', kind: 'trap', title: 'set without commit does nothing', x: 'cmsh stages changes (the prompt shows `*`). Until you `commit`, nothing is written to the database or pushed to nodes. "I changed the image but nodes still boot the old one" is often an uncommitted change.' },

        { t: 'h2', x: 'High availability: two head nodes' },
        { t: 'p', x: 'With one head node, losing it means losing provisioning, the cluster database, DHCP and usually `slurmctld`. [[bcm-ha|BCM HA]] adds a **passive** secondary head node that can take over the role of the **active** one.' },
        { t: 'vs', cards: [
          { h: 'What HA replicates / shares', items: [
            'Cluster database — replicated between the head nodes',
            'A shared **virtual IP** on internalnet (and externalnet) that moves with the active role',
            '`/cm/shared` and `/home` on **shared storage** (external NAS/NFS) mounted by the active head',
            'Heartbeat over a dedicated failover network or internalnet',
          ]},
          { h: 'What you must provide', items: [
            'A second head node with matching hardware and NIC layout',
            'Shared storage for /cm/shared and /home (or an accepted local-sync alternative)',
            'Working BMC/IPMI access so a failed head can be powered off (fenced)',
            'A licence that covers the HA pair (it is tied to the head nodes\' MAC addresses)',
          ]},
        ]},

        { t: 'h3', x: 'Setting up HA with cmha-setup' },
        { t: 'flow', steps: [
          { b: 'On the primary: run `cmha-setup`', s: 'Choose Setup → Configure. Supply the secondary\'s name, its MAC/interfaces, the shared virtual IPs and the failover network.' },
          { b: 'Prepare the secondary', s: 'The wizard creates the secondary head-node object and prepares the clone. It also asks for the licence update to include the second head node.' },
          { b: 'Clone the secondary', s: 'Boot the secondary (PXE from the primary, or the BCM ISO in rescue mode) and run `/cm/cm-clone-install --failover`. It copies the primary\'s disk to the secondary.' },
          { b: 'Finalize on the primary', s: 'Back in `cmha-setup`, run Finalize: database replication is set up and the secondary is rebooted into the passive role.' },
          { b: 'Configure shared storage', s: 'Use `cmha-setup` → Shared Storage to move `/cm/shared` and `/home` onto the NAS so both heads mount the same data.' },
          { b: 'Verify', s: '`cmha status` on both head nodes, then test a controlled failover with `cmha makeactive`.' },
        ]},
        { t: 'code', lang: 'bash', title: 'Verifying HA', x: `# On either head node
cmha status
#  Node Status: running in active mode
#  head1* -> head2
#    failoverping  [  OK  ]
#    mysql         [  OK  ]
#    ping          [  OK  ]
#    status        [  OK  ]
#  head2 -> head1*
#    failoverping  [  OK  ]
#    mysql         [  OK  ]
#    ...

# Controlled failover test: run on the PASSIVE node to take over
cmha makeactive

# Resync the database if the passive copy drifted
cmha dbreclone <passive-head>` },
        { t: 'callout', kind: 'exam', title: 'How failover is decided', x: [
          'The passive node watches the active one with heartbeat checks (ping, failover-network ping, CMDaemon status, database).',
          'Before taking over it asks the compute nodes to **vote** (quorum) — this prevents a split brain when only the link between the two heads fails.',
          'It then **powers off (fences)** the old active node through its BMC and claims the shared IP. Automatic failover therefore depends on working IPMI/Redfish on ipminet.',
        ]},
        { t: 'callout', kind: 'trap', title: 'Common HA pitfalls', x: [
          'Secondary cloned before the primary was fully configured → re-clone rather than hand-fix.',
          'No shared storage: `/cm/shared` and `/home` differ between heads and jobs break after failover.',
          'BMC credentials wrong in BCM: the passive node cannot fence the active one, so failover stalls.',
          'Licence not reissued for the pair: the secondary cannot run CMDaemon as active.',
        ]},

        { t: 'h2', x: 'Base View in one paragraph' },
        { t: 'p', x: '[[base-view|Base View]] is served by CMDaemon over HTTPS on the head node (the shared IP in an HA pair). It offers dashboards, node and category trees, software-image management, monitoring graphs and wizards for Kubernetes and workload managers. On the exam, treat it as equivalent to cmsh: if a question asks "where" to change a category setting, both are valid; if it asks for a command, the answer is cmsh.' },

        { t: 'callout', kind: 'tip', title: 'Docs to skim', x: [
          '[BCM Installation Manual and Administrator Manual](https://support.brightcomputing.com/manuals/11/admin-manual.pdf) — the HA chapter describes cmha-setup, cloning, shared storage and failover behaviour.',
          'DGX SuperPOD / BasePOD deployment guides show the category, image and network layout NVIDIA uses in reference designs.',
        ]},
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'os-cluster',
      title: 'OS installation, categories, interfaces and Slurm/Enroot/Pyxis',
      minutes: 16,
      blocks: [
        { t: 'lede', x: 'Objectives 3.2 and 3.3: install the OS on the nodes and complete the cluster install — categories, node interfaces (BMC, bonds, InfiniBand) and the workload layer: Slurm with GPU GRES, Enroot and Pyxis. Kubernetes and Run:ai are the alternative BCM can deploy.' },

        { t: 'h2', x: 'Three ways a GPU node gets its OS' },
        { t: 'table', head: ['Approach', 'How', 'When'], rows: [
          ['[[dgx-os|DGX OS]] from ISO', 'Boot the DGX OS ISO via BMC virtual media; the installer lays down Ubuntu plus the full DGX stack', 'Standalone DGX systems, or rebuilding a DGX outside a cluster manager'],
          ['Ubuntu / RHEL + DGX software stack', 'Install the distro, add the NVIDIA DGX repositories, install the DGX packages (drivers, Fabric Manager, NVSM, DCGM, DOCA, toolkit)', 'Sites that standardise on a distro or RHEL'],
          ['BCM software image', 'Build a DGX image on the head node (clone default-image, add the DGX stack in the chroot) and provision nodes over PXE', 'Any BCM-managed cluster — the SuperPOD/BasePOD model'],
        ]},
        { t: 'callout', kind: 'exam', title: 'In a BCM cluster you do not install nodes one by one', x: 'The OS is installed **once, into the software image**, and every node in the category receives it at provisioning. Installing a package on a running node by hand is lost the next time the node is re-synced from its image.' },

        { t: 'h3', x: 'Building a DGX image in BCM' },
        { t: 'code', lang: 'bash', title: 'Clone an image and work inside it', x: `# Clone the default image
cmsh -c "softwareimage; clone default-image dgx-image; commit"

# Enter the image as a chroot (BCM helper mounts /proc, /sys, /dev for you)
cm-chroot-sw-img /cm/images/dgx-image

# ...inside the chroot: add NVIDIA repos, install packages, then exit
apt update && apt install -y <dgx / driver / doca packages>
exit

# Point a category at it and push to running nodes
cmsh -c "category; use dgx-h100; set softwareimage dgx-image; commit"
cmsh -c "device; imageupdate -c dgx-h100 -w"` },
        { t: 'p', x: 'Kernel modules built in the chroot must be built for the **image\'s kernel**, not the head node\'s running kernel — install matching kernel headers in the image, and set the image\'s kernel version in BCM if you change it.' },

        { t: 'h2', x: 'Configuring categories' },
        { t: 'p', x: 'A [[bcm-category|category]] carries everything identical across a node type. Typical category settings for a DGX pool:' },
        { t: 'ul', items: [
          '**softwareimage** — which image to provision (dgx-image).',
          '**roles** — e.g. `slurmclient` so nodes run slurmd; BCM generates the Slurm config.',
          '**fsmounts** — NFS/parallel file systems ([[parallel-fs|Lustre, WEKA, GPFS]]) mounted on every node.',
          '**services** — make sure `nvidia-persistenced`, `nvidia-fabricmanager` and `nvidia-dcgm` are started and monitored.',
          '**kernelparameters / installmode / disksetup** — boot options, AUTO vs FULL, the partition layout.',
        ]},
        { t: 'callout', kind: 'tip', title: 'Inheritance', x: 'Node settings override category settings, which override defaults. Keep node-level overrides to what is genuinely per node — IP addresses, MACs, interfaces — so the category stays the single source of truth.' },

        { t: 'h2', x: 'Configuring node interfaces' },
        { t: 'p', x: 'Interfaces are set per device in `device` → `interfaces` mode. Each has a type and a network. On a DGX you normally configure the BMC, the in-band management port (often bonded) and the compute-fabric HCAs.' },
        { t: 'table', head: ['Interface', 'Type in BCM', 'Network', 'Notes'], rows: [
          ['`ipmi0` / `rf0`', 'BMC (IPMI or Redfish)', 'ipminet', 'Lets BCM power-control the node and read sensors; set BMC username/password at partition or category level'],
          ['`BOOTIF` / `eno1`', 'physical', 'internalnet', 'The provisioning interface; must be the NIC that PXE-boots'],
          ['`bond0`', 'bond (mode e.g. 802.3ad/LACP or active-backup)', 'internalnet', 'Two in-band ports for resilience; switch side must match the bond mode'],
          ['`ib0`…`ib7`', 'physical (IPoIB)', 'ibnet', 'One per [[connectx|ConnectX]] HCA on the compute rails; IP over IB used for addressing/tests, while NCCL uses RDMA verbs'],
        ]},
        { t: 'code', lang: 'bash', title: 'Adding a bond and an IB interface in cmsh', x: `cmsh
[head]% device use dgx001
[head->device[dgx001]]% interfaces
[head->device[dgx001]->interfaces]% add bond bond0
[head->...[bond0*]]% set interfaces enp170s0f0np0 enp170s0f1np1
[head->...[bond0*]]% set mode 4                 # 802.3ad / LACP
[head->...[bond0*]]% set network internalnet
[head->...[bond0*]]% set ip 10.141.0.11
[head->...[bond0*]]% commit

[head->device[dgx001]->interfaces]% add physical ib0
[head->...[ib0*]]% set network ibnet
[head->...[ib0*]]% set ip 10.149.0.11
[head->...[ib0*]]% commit

[head->device[dgx001]->interfaces]% list        # check type, network, IP` },
        { t: 'callout', kind: 'trap', title: 'IB interface up, but no IP traffic', x: '`ib0` needs the DOCA-Host/IPoIB stack in the image **and** a running [[subnet-manager|subnet manager]] on the fabric. `ibstat` showing `State: Initializing` means the SM is missing, not that BCM is misconfigured.' },

        { t: 'h2', x: 'Deploying Slurm with cm-wlm-setup' },
        { t: 'flow', steps: [
          { b: 'Run `cm-wlm-setup`', s: 'Choose Slurm, the server node(s) for slurmctld (head nodes, HA-aware), and the client categories (e.g. dgx-h100).' },
          { b: 'GPU settings', s: 'Enable GPU GRES and let the wizard configure autodetection so each client reports its GPUs.' },
          { b: 'Container integration', s: 'Select Pyxis (with Enroot) when offered so users can run `srun --container-image`.' },
          { b: 'Deploy', s: 'BCM writes slurm.conf, gres.conf and cgroup settings, assigns the slurmserver/slurmclient roles and starts the daemons.' },
          { b: 'Verify', s: '`sinfo`, `scontrol show node dgx001` (look for `Gres=gpu:8`), and a GPU job: `srun -N1 --gpus=8 nvidia-smi -L`.' },
        ]},
        { t: 'code', lang: 'ini', title: 'What GPU GRES looks like underneath', x: `# slurm.conf (generated by BCM)
GresTypes=gpu
NodeName=dgx[001-032] Gres=gpu:8 CPUs=224 RealMemory=2000000 State=UNKNOWN

# gres.conf
AutoDetect=nvml          # slurmd enumerates GPUs through NVML (needs the driver)` },
        { t: 'callout', kind: 'exam', title: 'GRES failure modes', x: [
          'Node declared with `Gres=gpu:8` but only 7 GPUs detected → slurmd registers fewer GPUs and the node goes to **drain** with an "invalid gres" style reason.',
          '`AutoDetect=nvml` needs the NVIDIA driver working on the node — a node with a broken driver cannot report GPUs.',
          'Jobs that do not ask for GPUs (`--gpus` or `--gres=gpu:N`) get none, because cgroups hide the devices.',
        ]},

        { t: 'h2', x: 'Enroot and Pyxis' },
        { t: 'p', x: '[[enroot|Enroot]] imports a container image (for example from [[ngc|NGC]]) and unpacks it into an unprivileged sandbox — no daemon, no root. [[pyxis|Pyxis]] is a Slurm SPANK plugin that adds `--container-image`, `--container-mounts` and `--container-name` to `srun`. Both are installed in the compute image; Pyxis is enabled by a plugstack.conf entry.' },
        { t: 'code', lang: 'bash', title: 'Using them', x: `# Credentials for nvcr.io (per user)  — ~/.config/enroot/.credentials
machine nvcr.io login $oauthtoken password <NGC_API_KEY>

# Enroot alone
enroot import docker://nvcr.io#nvidia/pytorch:24.05-py3
enroot create --name pt nvidia+pytorch+24.05-py3.sqsh
enroot start --rw pt nvidia-smi

# Pyxis under Slurm (note the # between registry and image)
srun -N2 --ntasks-per-node=8 --gpus-per-node=8 \\
     --container-image=nvcr.io#nvidia/pytorch:24.05-py3 \\
     --container-mounts=/lustre/data:/data \\
     python train.py

# Pyxis is loaded via /etc/slurm/plugstack.conf(.d):
#   required /usr/lib/x86_64-linux-gnu/slurm/spank_pyxis.so` },
        { t: 'callout', kind: 'trap', title: 'The image reference uses #', x: 'Enroot/Pyxis write the registry separator as `#`: `nvcr.io#nvidia/pytorch:24.05-py3`. With `/` Enroot treats `nvcr.io` as part of the image path on Docker Hub, and the pull fails.' },

        { t: 'h2', x: 'Kubernetes and Run:ai as the alternative' },
        { t: 'p', x: 'BCM can also deploy Kubernetes (`cm-kubernetes-setup`), including the NVIDIA GPU Operator and Network Operator, onto a category of nodes. [[run-ai|NVIDIA Run:ai]] is then installed on top of that Kubernetes cluster to provide AI-specific scheduling: projects and quotas, fair share, over-quota borrowing and fractional GPUs.' },
        { t: 'vs', cards: [
          { h: 'Slurm + Enroot/Pyxis', items: [
            'Batch HPC model; gang scheduling for multi-node training',
            'Deployed with cm-wlm-setup',
            'Containers via srun --container-image',
            'Default on DGX SuperPOD',
          ]},
          { h: 'Kubernetes + Run:ai', items: [
            'Cloud-native model; pods, operators, Helm',
            'Deployed with cm-kubernetes-setup, then Run:ai',
            'Quotas, fair share, fractional GPUs, notebooks, inference',
            'Common for mixed training/inference platforms',
          ]},
        ]},
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'drivers',
      title: 'Installing, updating and removing GPU and DOCA drivers',
      minutes: 15,
      blocks: [
        { t: 'lede', x: 'Objective 3.4: install, update and remove NVIDIA GPU and DOCA drivers. The exam cares about the right package flavour, the dependencies that must match (Fabric Manager, kernel headers, the IB stack) and the order of operations when a driver is live on a production node.' },

        { t: 'h2', x: 'The GPU driver stack on a node' },
        { t: 'table', head: ['Component', 'Role', 'Must match'], rows: [
          ['Kernel modules `nvidia`, `nvidia_uvm`, `nvidia_modeset`, `nvidia_drm`', 'The driver itself', 'The running kernel (built by [[dkms|DKMS]] or precompiled)'],
          ['User-space libraries (libcuda, NVML)', 'CUDA driver API, [[nvidia-smi|nvidia-smi]]', 'The kernel module version exactly'],
          ['[[fabric-manager|nvidia-fabricmanager]]', 'Programs NVSwitch routing on HGX/DGX', 'The driver version exactly (same branch and build)'],
          ['[[persistence-mode|nvidia-persistenced]]', 'Keeps GPUs initialised between jobs', 'Installed with the driver'],
          ['[[nvidia-peermem|nvidia-peermem]]', 'GPUDirect RDMA with the HCA', 'The installed IB stack (DOCA-Host)'],
        ]},

        { t: 'h2', x: 'Before installing: prerequisites' },
        { t: 'ul', items: [
          '**Blacklist [[nouveau|nouveau]]** and rebuild the initramfs so it does not grab the GPUs.',
          '**Install kernel headers** for the running kernel (`linux-headers-$(uname -r)` / `kernel-devel-$(uname -r)`) so DKMS can build the module.',
          '**Pick the flavour:** [[open-kernel-modules|open kernel modules]] for Hopper and newer (required on Grace Hopper and Blackwell), and the **-server** branch packages for data-center GPUs.',
          '**Install the network stack first** (DOCA-Host) if you need GPUDirect RDMA, so nvidia-peermem builds against it.',
          'Check Secure Boot: unsigned DKMS-built modules will not load unless signed/enrolled — or use precompiled signed modules.',
        ]},
        { t: 'code', lang: 'bash', title: 'Blacklisting nouveau', x: `cat <<'EOF' | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
blacklist nouveau
options nouveau modeset=0
EOF
sudo update-initramfs -u        # RHEL: sudo dracut --force
sudo reboot
lsmod | grep nouveau            # must print nothing` },

        { t: 'h2', x: 'Installing with the package manager' },
        { t: 'p', x: 'Use the distribution packages from the NVIDIA CUDA / DGX repositories rather than the `.run` file on managed nodes: packages integrate with DKMS, pull in the matching utilities and are removable cleanly.' },
        { t: 'code', lang: 'bash', title: 'Ubuntu', x: `# From the CUDA network repo (cuda-keyring installed) or DGX repo
sudo apt update
sudo apt install -y nvidia-driver-570-server-open      # open modules, server branch
#   alternatives: 'cuda-drivers' (tracks the latest), 'nvidia-open'
sudo apt install -y nvidia-fabricmanager-570           # same branch as the driver
sudo systemctl enable --now nvidia-fabricmanager nvidia-persistenced
sudo reboot` },
        { t: 'code', lang: 'bash', title: 'RHEL / Rocky', x: `sudo dnf config-manager --add-repo \\
  https://developer.download.nvidia.com/compute/cuda/repos/rhel9/x86_64/cuda-rhel9.repo
sudo dnf install -y kernel-devel-$(uname -r) kernel-headers-$(uname -r)
sudo dnf install -y nvidia-open            # or: dnf module install nvidia-driver:570-open
sudo dnf install -y nvidia-fabric-manager
sudo systemctl enable --now nvidia-fabricmanager nvidia-persistenced` },

        { t: 'h3', x: 'Verifying' },
        { t: 'code', lang: 'bash', title: 'Post-install checks', x: `nvidia-smi                                   # driver version, all 8 GPUs listed
cat /proc/driver/nvidia/version              # kernel module version
modinfo nvidia | grep -i license             # "Dual MIT/GPL" = open modules
dkms status                                  # nvidia/570.xx: installed for this kernel
systemctl status nvidia-fabricmanager        # active (running) on NVSwitch systems
nvidia-smi -q | grep -i -A2 fabric           # fabric state: Completed / Success
nvidia-smi topo -m                           # NV18 between GPUs on HGX H100` },
        { t: 'callout', kind: 'exam', title: 'Fabric Manager version = driver version', x: 'On NVSwitch systems, CUDA jobs fail (for example "system not yet initialized", error 802) if [[fabric-manager|Fabric Manager]] is stopped or its version differs from the driver. Every driver update must update Fabric Manager to the **identical** version in the same maintenance window.' },

        { t: 'h2', x: 'Updating a driver on a production node' },
        { t: 'flow', steps: [
          { b: 'Drain the node', s: '`scontrol update nodename=dgx001 state=drain reason="driver update"` — wait for running jobs to finish.' },
          { b: 'Stop GPU clients', s: '`systemctl stop nvidia-dcgm nvidia-fabricmanager nvidia-persistenced` (and any exporters or containers using the GPUs).' },
          { b: 'Unload the modules', s: '`rmmod nvidia_drm nvidia_modeset nvidia_uvm nvidia` (also `nvidia_peermem` if loaded). `lsof /dev/nvidia*` shows who is still holding them.' },
          { b: 'Upgrade driver + Fabric Manager together', s: 'Same version for both; update DKMS builds for the current kernel.' },
          { b: 'Reboot (recommended) or reload', s: 'Start services, run `nvidia-smi`, a DCGM quick diag, and a short NCCL test.' },
          { b: 'Resume', s: '`scontrol update nodename=dgx001 state=resume`.' },
        ]},
        { t: 'callout', kind: 'trap', title: '"Failed to initialize NVML: Driver/library version mismatch"', x: 'The user-space libraries were upgraded but the old kernel module is still loaded. Unload and reload the modules — or simply reboot. It is not a hardware fault.' },

        { t: 'h2', x: 'Removing a driver' },
        { t: 'code', lang: 'bash', title: 'Clean removal', x: `# Package installs (Ubuntu)
sudo apt purge -y '^nvidia-.*' '^libnvidia-.*' 'cuda-drivers*'
sudo apt autoremove -y

# RHEL
sudo dnf remove -y 'nvidia-*' && sudo dnf module reset nvidia-driver

# Run-file installs only
sudo nvidia-uninstall     # (or: sudo /usr/bin/nvidia-uninstall)` },
        { t: 'p', x: 'Never mix installation methods: a `.run` install on top of packages (or vice versa) leaves conflicting files. Remove one completely before installing with the other.' },

        { t: 'h2', x: 'Drivers in a BCM cluster' },
        { t: 'p', x: 'In BCM the driver is part of the [[software-image|software image]]. Install or update it inside the image chroot (BCM also packages a `cuda-driver` for its images), make sure the module is built for the image\'s kernel, then roll it out.' },
        { t: 'flow', steps: [
          { b: 'Clone the image', s: '`softwareimage; clone dgx-image dgx-image-570` — keep the old image for rollback.' },
          { b: 'Install in the chroot', s: 'Driver, matching Fabric Manager, headers for the image kernel.' },
          { b: 'Test on one node', s: 'Point a test node (or a small test category) at the new image and reboot it.' },
          { b: 'Roll out', s: 'Drain, switch the category\'s image, then reboot the nodes or run [[imageupdate|imageupdate]] and reload the modules.' },
        ]},
        { t: 'callout', kind: 'tip', title: 'Why cloning beats editing the live image', x: 'Rollback becomes "point the category back at the old image and reboot". Editing the image every node uses in place means a bad driver hits every node on its next sync.' },

        { t: 'h2', x: 'DOCA-Host: the network driver stack' },
        { t: 'p', x: '[[doca-host|DOCA-Host]] replaces MLNX_OFED as the host driver package for [[connectx|ConnectX]] and [[bluefield|BlueField]]. It is installed from a repository package and offers **profiles**.' },
        { t: 'table', head: ['Profile / package', 'Contains', 'Typical use'], rows: [
          ['`doca-all`', 'Full DOCA-Host: drivers, libraries, tools, DOCA SDK runtime', 'BlueField-attached hosts, dev/test'],
          ['`doca-ofed`', 'The OFED-equivalent set: mlx5 drivers, rdma-core, IB tools, IPoIB, openibd', 'GPU compute nodes needing IB/RoCE and GPUDirect'],
          ['`doca-networking`', 'Networking-focused subset', 'Ethernet-only hosts'],
        ]},
        { t: 'code', lang: 'bash', title: 'Installing DOCA-Host on Ubuntu', x: `# Download the doca-host repo package for your distro from the DOCA downloads page
sudo dpkg -i doca-host_<version>_ubuntu2204_amd64.deb
sudo apt update
sudo apt install -y doca-ofed            # or doca-all

# Load the new stack (or reboot)
sudo /etc/init.d/openibd restart

# Verify
ofed_info -s                             # version string, e.g. OFED-internal-25.xx / DOCA
ibstat                                   # HCAs, State: Active, Rate: 400 (NDR)
ibv_devinfo | grep -E 'hca_id|state'
sudo mst start && sudo mst status        # MFT view of the devices` },
        { t: 'callout', kind: 'exam', title: 'Order of installation for GPUDirect RDMA', x: [
          'Install **DOCA-Host first**, then the GPU driver — `nvidia-peermem` is built against the IB stack present at driver install time.',
          'If you change or upgrade DOCA-Host after the driver, reinstall/rebuild the GPU driver so peermem matches.',
          'Load it with `modprobe nvidia-peermem` and make it persistent (modules-load.d); `lsmod | grep peermem` confirms.',
        ]},
        { t: 'callout', kind: 'trap', title: 'Removing DOCA-Host', x: 'Remove with the distribution package manager (purge the doca/ofed packages, or use the uninstall script provided with the release), then reboot or restart openibd. Remove MLNX_OFED fully before installing DOCA-Host — they must not coexist.' },
        { t: 'callout', kind: 'tip', title: 'Reference', x: '[DOCA-Host installation and upgrade guide](https://docs.nvidia.com/doca/sdk/doca-host-installation-and-upgrade.pdf) — profiles, repo packages per distro, upgrade and uninstall steps.' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'containers-ngc',
      title: 'Container Toolkit, GPUs in Docker and the NGC CLI',
      minutes: 13,
      blocks: [
        { t: 'lede', x: 'Objectives 3.5–3.7: install the NVIDIA Container Toolkit, demonstrate how to use GPUs with Docker, and install the NGC CLI on hosts. These are hands-on, command-level questions — know the exact commands and the classic failure messages.' },

        { t: 'h2', x: 'How GPUs reach a container' },
        { t: 'p', x: 'Containers do **not** ship the kernel driver. The host has the driver; the [[container-toolkit|NVIDIA Container Toolkit]] hooks into the container runtime and, at start-up, mounts the device nodes (`/dev/nvidia*`) and the matching user-space driver libraries into the container. That is why one CUDA container runs on hosts with different driver versions — provided the host driver is new enough for the container\'s CUDA version.' },
        { t: 'flow', steps: [
          { b: 'docker run --gpus …', s: 'Docker passes the GPU request to the configured runtime.' },
          { b: 'nvidia-container-runtime', s: 'A thin wrapper around runc registered in daemon.json by nvidia-ctk.' },
          { b: 'nvidia-container-toolkit / libnvidia-container', s: 'Resolves which GPUs, injects devices and driver libraries (or applies a [[cdi|CDI]] spec).' },
          { b: 'Container', s: '`nvidia-smi` inside shows only the GPUs it was given.' },
        ]},

        { t: 'h2', x: 'Installing the toolkit' },
        { t: 'code', lang: 'bash', title: 'Ubuntu / Debian (apt)', x: `# 1. Repository and signing key
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \\
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \\
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \\
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 2. Install
sudo apt update
sudo apt install -y nvidia-container-toolkit

# 3. Register the runtime with Docker and restart it
sudo nvidia-ctk runtime configure --runtime=docker     # edits /etc/docker/daemon.json
sudo systemctl restart docker

# 4. Test
docker run --rm --gpus all ubuntu nvidia-smi` },
        { t: 'code', lang: 'bash', title: 'RHEL family (dnf) and other runtimes', x: `curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo \\
  | sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
sudo dnf install -y nvidia-container-toolkit

sudo nvidia-ctk runtime configure --runtime=containerd && sudo systemctl restart containerd
sudo nvidia-ctk runtime configure --runtime=crio       && sudo systemctl restart crio` },
        { t: 'callout', kind: 'exam', title: 'The four steps', x: 'Repo → `apt/dnf install nvidia-container-toolkit` → `nvidia-ctk runtime configure --runtime=docker` → **restart Docker**. The driver must already be installed on the host; the toolkit does not install it. [Install guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).' },

        { t: 'h2', x: 'Using GPUs with Docker' },
        { t: 'table', head: ['Goal', 'Command'], rows: [
          ['All GPUs', '`docker run --rm --gpus all nvcr.io/nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`'],
          ['Two GPUs, any', '`docker run --rm --gpus 2 … nvidia-smi`'],
          ['Specific GPUs', '`docker run --rm --gpus \'"device=0,1"\' … nvidia-smi` (inner quotes needed because of the comma)'],
          ['By UUID or MIG device', '`--gpus \'"device=GPU-3f2a…"\'` or `--gpus \'"device=0:1"\'`'],
          ['Env-var style (nvidia runtime)', '`docker run --rm --runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=0,1 … nvidia-smi`'],
          ['Limit driver capabilities', '`-e NVIDIA_DRIVER_CAPABILITIES=compute,utility`'],
          ['Typical training container', '`docker run --gpus all --ipc=host --ulimit memlock=-1 --ulimit stack=67108864 -it nvcr.io/nvidia/pytorch:24.05-py3`'],
        ]},
        { t: 'callout', kind: 'trap', title: 'Classic errors', x: [
          '`could not select device driver "" with capabilities: [gpu]` → toolkit not installed, runtime not configured, or Docker not restarted after `nvidia-ctk runtime configure`.',
          '`nvidia-smi: command not found` inside the container with no `--gpus` flag → the container was started without GPUs; nothing is injected.',
          '`CUDA driver version is insufficient for CUDA runtime version` → the host driver is older than the container\'s CUDA requires; update the host driver or use an older container.',
          '`--gpus device=0,1` without the inner quotes → Docker parses the comma as a new option and errors.',
        ]},

        { t: 'h3', x: 'CDI: the newer device model' },
        { t: 'p', x: 'The [[cdi|Container Device Interface]] describes GPUs in a spec file, which runtimes such as Podman, containerd and CRI-O consume natively. Generate the spec after installing the driver and regenerate it whenever the driver or GPU configuration changes (including [[mig|MIG]] layout).' },
        { t: 'code', lang: 'bash', title: 'CDI', x: `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
nvidia-ctk cdi list                    # nvidia.com/gpu=0 … nvidia.com/gpu=all
podman run --rm --device nvidia.com/gpu=all ubuntu nvidia-smi -L` },

        { t: 'h2', x: 'The NGC CLI' },
        { t: 'p', x: 'The [[ngc|NGC CLI]] (`ngc`) downloads models, resources and container metadata from NGC and manages org/team resources. It is a self-contained binary distributed as a zip. Authentication uses an [[ngc-api-key|NGC API key]] generated in the NGC web UI.' },
        { t: 'code', lang: 'bash', title: 'Install and configure', x: `# 1. Download (link/version from the NGC CLI install page) and verify
wget --content-disposition \\
  https://api.ngc.nvidia.com/v2/resources/nvidia/ngc-apps/ngc_cli/versions/<ver>/files/ngccli_linux.zip \\
  -O ngccli_linux.zip
sha256sum ngccli_linux.zip             # compare with the published checksum
unzip ngccli_linux.zip
chmod u+x ngc-cli/ngc
echo "export PATH=\\"\\$PATH:$(pwd)/ngc-cli\\"" >> ~/.bash_profile && source ~/.bash_profile

# 2. Configure: prompts for API key, output format (ascii/csv/json), org, team, ACE
ngc config set
ngc config current                     # shows the active key (masked), org and team
#   stored in ~/.ngc/config

# 3. Use it
ngc registry image list nvidia/pytorch*
ngc registry model download-version nvidia/<model>:<version>
ngc registry resource download-version nvidia/<resource>:<version>` },
        { t: 'code', lang: 'bash', title: 'Docker login to nvcr.io', x: `docker login nvcr.io
Username: $oauthtoken
Password: <paste the NGC API key>

# Non-interactive (CI / scripts)
echo "$NGC_API_KEY" | docker login nvcr.io --username '$oauthtoken' --password-stdin` },
        { t: 'callout', kind: 'exam', title: '$oauthtoken is literal', x: 'The username for nvcr.io is the **literal string** `$oauthtoken`; the password is the API key. In scripts single-quote it so the shell does not expand `$oauthtoken` into an empty variable. The NGC CLI itself does not use docker login — it reads the key from `ngc config set`.' },
        { t: 'callout', kind: 'tip', title: 'Org and team matter', x: 'Private models and containers live under an **org** (and optionally a **team**). "Access denied" for a private asset with a valid key usually means `ngc config set` points at the wrong org/team. See the [NGC CLI documentation](https://docs.ngc.nvidia.com/cli/cmd.html).' },

        { t: 'h2', x: 'Putting it together on a cluster' },
        { t: 'table', head: ['Where', 'Container path', 'Credential'], rows: [
          ['Standalone DGX / workstation', 'Docker + Container Toolkit (`--gpus`)', '`docker login nvcr.io` with `$oauthtoken`'],
          ['Slurm cluster', '[[enroot|Enroot]] + [[pyxis|Pyxis]] (`srun --container-image`)', '`~/.config/enroot/.credentials` with the same key'],
          ['Kubernetes cluster', 'containerd + GPU Operator (toolkit deployed as a DaemonSet)', 'Image pull secret for nvcr.io'],
          ['Models/datasets on any host', 'NGC CLI (`ngc registry … download-version`)', '`ngc config set`'],
        ]},
      ],
    },
  ],

  /* ==================================================================== */
  quiz: [
    { id: 'c01', domain: 'controlplane',
      scenario: 'A new BCM head node has been installed with a Type 1 network topology. Compute nodes are set to PXE-boot but never reach the node-installer.',
      q: 'Over which BCM network must the compute nodes\' boot interfaces be connected for provisioning to work?',
      opts: ['ipminet', 'externalnet', 'internalnet', 'ibnet'],
      a: 2,
      why: 'In a Type 1 topology, nodes PXE-boot, get DHCP and TFTP and receive their software image from the head node over **internalnet** (default 10.141.0.0/16). The boot interface must be on that network and first in the boot order.',
      distract: '**ipminet** carries BMC traffic for power control, **externalnet** connects the head node to the site network, and an **InfiniBand** network is added later for the compute fabric; none of them provisions nodes.' },

    { id: 'c02', domain: 'controlplane',
      scenario: 'An administrator runs cmsh, enters category mode, uses the dgx-h100 category and runs "set softwareimage dgx-image-570". She exits cmsh and reboots a node, which still boots the old image.',
      q: 'What is the most likely reason?',
      opts: [
        'The change was not committed',
        'Software images can only be changed from Base View',
        'The node must be moved to the FULL install mode first',
        'imageupdate must run before any category change',
      ],
      a: 0,
      why: 'cmsh stages changes (the prompt shows an asterisk) until `commit` is issued. Exiting without committing throws the change away, so the category still references the old image.',
      distract: 'cmsh and **Base View** are equivalent front-ends. **FULL** install mode is not needed to switch images, and **imageupdate** syncs a node with its image; it does not apply uncommitted category changes.' },

    { id: 'c03', domain: 'controlplane',
      scenario: 'A two-head-node BCM cluster has been configured with cmha-setup. The team wants to prove, before go-live, that the secondary can take over.',
      q: 'What is the correct way to check HA health and test a controlled failover?',
      opts: [
        'Run `cmsh -c "device; list"` and then power off the primary from its BMC',
        'Run `cmha status` on the head nodes, then `cmha makeactive` on the passive node',
        'Run `cm-clone-install --failover` again on the secondary',
        'Stop CMDaemon on the primary and check that `sinfo` still responds',
      ],
      a: 1,
      why: '`cmha status` shows the active/passive roles and the heartbeat, failover-ping and database checks in both directions. `cmha makeactive` on the passive node performs a controlled role switch, which is the supported way to test failover.',
      distract: 'A **device list** shows no HA state, and pulling power tests only the uncontrolled path. **cm-clone-install** re-clones the secondary and is not a test. **Stopping CMDaemon** by hand is not a supported failover test.' },

    { id: 'c04', domain: 'controlplane',
      scenario: 'During an HA test the link between the two head nodes is cut, but both heads can still reach the compute nodes.',
      q: 'Which BCM mechanism stops both head nodes from becoming active at the same time?',
      opts: [
        'The shared storage lock on /home',
        'Slurm\'s slurmctld backup controller',
        'DHCP lease timeout on internalnet',
        'Quorum voting by the compute nodes, followed by fencing through the BMC',
      ],
      a: 3,
      why: 'Before taking over, the passive head asks the compute nodes whether they can still see the active head (quorum). Only if the majority cannot does it take over, and it powers off (fences) the old active node through its BMC so there is no split brain.',
      distract: 'Shared storage, **Slurm backup controllers** and **DHCP leases** play no part in BCM head-node failover decisions.' },

    { id: 'c05', domain: 'controlplane',
      scenario: 'Slurm has been deployed with cm-wlm-setup. `scontrol show node dgx014` shows the node drained with a reason about gres/gpu count reported lower than configured. The other nodes are fine.',
      q: 'What should the administrator investigate first?',
      opts: [
        'The GPUs on dgx014, e.g. nvidia-smi shows only 7 GPUs or the driver fails to load',
        'The slurm.conf GresTypes line, which must be missing',
        'Pyxis, which must be reinstalled on dgx014',
        'Whether munge keys differ between head node and dgx014',
      ],
      a: 0,
      why: 'With `AutoDetect=nvml`, slurmd counts GPUs through NVML. If a GPU has fallen off the bus or the driver is broken, it reports fewer GPUs than `Gres=gpu:8` declares and Slurm drains the node. Check `nvidia-smi` and the kernel log for Xid 79 first.',
      distract: 'A missing **GresTypes** would affect every node, not one. **Pyxis** does not affect GPU counts, and a **munge** mismatch would stop the node from registering at all rather than report a GRES mismatch.' },

    { id: 'c06', domain: 'controlplane',
      scenario: 'Users on a Slurm cluster with Pyxis run: `srun --container-image=nvcr.io/nvidia/pytorch:24.05-py3 python train.py`. The pull fails with an authentication or not-found error from Docker Hub.',
      q: 'What is the fix?',
      opts: [
        'Install Docker on every compute node',
        'Add --gpus all to the srun line',
        'Write the image as nvcr.io#nvidia/pytorch:24.05-py3 and make sure Enroot has nvcr.io credentials',
        'Run the job with sudo so Enroot can pull images',
      ],
      a: 2,
      why: 'Enroot and Pyxis use `#` to separate the registry from the image path. With `/`, Enroot treats the whole string as a Docker Hub path. nvcr.io also needs credentials in `~/.config/enroot/.credentials` (login `$oauthtoken`, password the API key).',
      distract: 'Enroot does not need **Docker**, and `--gpus` is a GPU request that has nothing to do with the pull error. The point of Enroot is that it runs **unprivileged**, so sudo is not needed.' },

    { id: 'c07', domain: 'controlplane',
      scenario: 'After a package update on an HGX H100 node, nvidia-smi works but every CUDA job fails with "system not yet initialized". The node was updated from driver 550 to 570.',
      q: 'What is the most likely cause?',
      opts: [
        'nouveau was re-enabled by the update',
        'The nvidia-persistenced service is disabled',
        'The Container Toolkit must be reconfigured for the new driver',
        'nvidia-fabricmanager is still at 550 or not running, so it does not match the 570 driver',
      ],
      a: 3,
      why: 'On NVSwitch systems, Fabric Manager must run at exactly the same version as the driver. If Fabric Manager is still at 550 (or failed to start), the NVSwitch fabric is not set up and CUDA reports that the system is not initialised.',
      distract: 'If **nouveau** were active, nvidia-smi would fail as well. **Persistence mode** affects start-up latency, not fabric initialisation, and the **Container Toolkit** is not involved in bare-metal CUDA jobs.' },

    { id: 'c08', domain: 'controlplane',
      scenario: 'An admin is writing a runbook for upgrading the GPU driver on production Slurm nodes.',
      q: 'Which order is correct?',
      opts: [
        'Upgrade the packages, reboot, then drain the node',
        'Drain the node, stop GPU services (DCGM, Fabric Manager, persistenced), unload the nvidia modules, upgrade driver and Fabric Manager together, reboot and validate, then resume',
        'Stop Slurm on the whole cluster, upgrade all nodes in parallel, restart Slurm',
        'Unload the nvidia modules while jobs are running, upgrade, then drain the node',
      ],
      a: 1,
      why: 'Draining lets running jobs finish, and stopping the services and unloading the modules frees the GPUs. Driver and Fabric Manager are upgraded to the same version, then a reboot and a validation (nvidia-smi, DCGM, NCCL) come before the node returns to service.',
      distract: 'Upgrading **before draining** kills jobs. A **cluster-wide stop** causes needless downtime and gives no canary node, and modules cannot be unloaded while processes hold the GPUs.' },

    { id: 'c09', domain: 'controlplane',
      scenario: 'Multi-node NCCL on a new cluster performs far below expectations. NCCL logs show GPUDirect RDMA is not used. DOCA-Host was installed after the GPU driver.',
      q: 'What is the most appropriate fix?',
      opts: [
        'Reinstall or rebuild the GPU driver so nvidia-peermem builds against the installed DOCA-Host stack, then load nvidia-peermem',
        'Replace DOCA-Host with the in-box distribution RDMA drivers',
        'Disable IPoIB on the ib interfaces',
        'Set NVIDIA_VISIBLE_DEVICES=all in the environment',
      ],
      a: 0,
      why: 'nvidia-peermem comes with the GPU driver and must be built against the IB stack that is present. Install DOCA-Host first and then the driver, or reinstall the driver afterwards, then `modprobe nvidia-peermem` and make it persistent.',
      distract: '**In-box drivers** are a step backwards and do not fix peermem. **IPoIB** is not the RDMA data path NCCL uses, and **NVIDIA_VISIBLE_DEVICES** is a container setting that has nothing to do with GPUDirect.' },

    { id: 'c10', domain: 'controlplane',
      scenario: 'On a freshly installed Ubuntu host with a working driver, `docker run --rm --gpus all ubuntu nvidia-smi` fails with: could not select device driver "" with capabilities: [gpu].',
      q: 'Which sequence fixes it?',
      opts: [
        'Install CUDA inside the ubuntu image and rerun',
        'Reinstall the GPU driver with the .run file',
        'Add the NVIDIA repo, install nvidia-container-toolkit, run nvidia-ctk runtime configure --runtime=docker, restart Docker',
        'Run the container with --privileged instead of --gpus',
      ],
      a: 2,
      why: 'The error means Docker has no GPU-capable runtime registered. Install the toolkit, register it in daemon.json with `nvidia-ctk runtime configure --runtime=docker`, and restart Docker so it reloads the configuration.',
      distract: 'Containers **do not need CUDA** installed to run nvidia-smi, because the toolkit injects the driver libraries. The **driver** already works, and `--privileged` exposes devices without the libraries and is bad practice.' },

    { id: 'c11', domain: 'controlplane',
      q: 'An engineer must log Docker in to nvcr.io from a CI script using an NGC API key stored in $NGC_API_KEY. Which command is correct?',
      opts: [
        'docker login nvcr.io --username "$NGC_USER_EMAIL" --password "$NGC_API_KEY"',
        'ngc config set --registry docker',
        'docker login nvcr.io --username oauthtoken --password-stdin',
        'echo "$NGC_API_KEY" | docker login nvcr.io --username \'$oauthtoken\' --password-stdin',
      ],
      a: 3,
      why: 'For nvcr.io the username is the literal string `$oauthtoken` (single-quoted so the shell does not expand it) and the password is the API key, which `--password-stdin` passes safely.',
      distract: 'Your **e-mail** is not the registry username, and `oauthtoken` **without the $** fails. **ngc config set** configures the NGC CLI, not Docker\'s registry credentials.' },

    { id: 'c12', domain: 'controlplane',
      scenario: 'A BCM-managed DGX cluster needs a new GPU driver branch. The administrator wants a quick rollback path if the driver misbehaves.',
      q: 'What is the recommended BCM approach?',
      opts: [
        'SSH to each node and run apt upgrade, then snapshot the disks',
        'Clone the current software image, install the driver and matching Fabric Manager in the clone, test one node on it, then switch the category and reboot or imageupdate the nodes',
        'Install the driver on the head node and export /usr over NFS',
        'Edit the default-image in place and run imageupdate on all nodes at once',
      ],
      a: 1,
      why: 'In BCM the software image is the source of truth. A cloned image leaves the old one untouched, a canary node validates the new one, and rolling back is just pointing the category at the old image again.',
      distract: '**Per-node changes** are overwritten at the next sync. **Exporting /usr** does not deliver kernel modules. **Editing the live image** in place removes the rollback path and hits every node at once.' },
  ],
}
