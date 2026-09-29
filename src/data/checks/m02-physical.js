// End-of-lesson comprehension checks for Module 2: Physical Layer Management. Keyed by lesson id.
export default {
  bluefield: [
    {
      q: 'A BlueField-3 is in its factory-default operating mode. Who controls the data path for host traffic?',
      opts: [
        'The host driver, exactly as on a ConnectX adapter',
        'The Arm cores, which own the eSwitch and see a representor per host function',
        'The BlueField BMC, which forwards packets over NC-SI',
        'Nobody until a BFB is installed; the card passes no traffic by default',
      ],
      a: 1,
      why: 'The default is **DPU mode** (embedded CPU function, `INTERNAL_CPU_MODEL=1`): the Arm side owns the NIC, runs OVS and sees uplinks p0/p1 plus representors such as pf0hpf.',
      distract: 'Host ownership describes **NIC mode**. The **BMC** is a management controller, not a data path. Cards ship with an OS image and pass traffic.',
    },
    {
      q: 'Which host-side path gives you the Arm serial console and lets you push a BFB even when the DPU\'s Arm OS is not booting?',
      opts: [
        'SSH over oob_net0',
        'The mlxlink tool against /dev/mst/mt41692_pciconf0',
        'The Redfish API of the host server BMC',
        'The rshim interface: /dev/rshim0/console and /dev/rshim0/boot',
      ],
      a: 3,
      why: '**rshim** is a hardware-level management channel that works without the Arm OS: `console` gives the serial console and writing a BFB to `boot` (or running `bfb-install`) reinstalls the OS.',
      distract: '**oob_net0** needs a running Arm OS. **mlxlink** reports link state and signal quality. The **host BMC** has no rshim of its own — only the BlueField BMC does.',
    },
    {
      q: 'You need to install a BFB on a BlueField-3 in a server whose host OS has not been installed yet. Which option works?',
      opts: [
        'Push the BFB from the BlueField BMC over Redfish, which writes it through its own rshim',
        'Run bfb-install on the host — it runs from UEFI without an OS',
        'Use mlxfwmanager --online, which downloads and installs the Arm OS',
        'Wait for PXE; BlueField DPUs always network-boot their OS from the head node',
      ],
      a: 0,
      why: 'The **BlueField BMC** can install a BFB independently of the host, reached through the card\'s 1 GbE OOB port. See NVIDIA\'s "Deploying DPU OS using BFB from BMC" procedure.',
      distract: '**bfb-install** is a Linux tool that needs a host OS and the rshim driver. **mlxfwmanager** updates NIC firmware only. DPUs boot from on-card storage by default, not PXE.',
    },
    {
      q: 'After running `mlxconfig -d <dev> s LINK_TYPE_P1=1`, what does the value 1 select, and when does it take effect?',
      opts: [
        'Ethernet; immediately',
        'NIC mode; after restarting the rshim service',
        'InfiniBand; after a firmware reset or cold power cycle',
        'InfiniBand; immediately, but only on the Arm side',
      ],
      a: 2,
      why: 'For `LINK_TYPE_Px`, **1 = InfiniBand and 2 = Ethernet**. All mlxconfig values are written to Next Boot and become Current after `mlxfwreset` or a cold boot.',
      distract: 'Ethernet is 2, not 1. NIC mode is controlled by `INTERNAL_CPU_OFFLOAD_ENGINE`, not LINK_TYPE. No mlxconfig change applies immediately.',
    },
    {
      q: 'Which use case most clearly requires DPU mode rather than NIC mode?',
      opts: [
        'Providing a single 400 Gb/s Ethernet link to the host with the simplest possible driver setup',
        'Offloading OVS and enforcing tenant network policy on the card, outside the host\'s control',
        'Running mlxlink to check BER on the uplink',
        'Updating the NIC firmware with flint',
      ],
      a: 1,
      why: '**OVS offload and isolated policy enforcement** run on the Arm cores and eSwitch — they require DPU mode, where the Arm side owns the data path.',
      distract: 'A **plain 400G link** is exactly what NIC mode is for. **mlxlink** and **flint** work in either mode.',
    },
  ],

  mig: [
    {
      q: 'On an H100 80GB, what does the MIG profile name "3g.40gb" mean?',
      opts: [
        '3 GPUs sharing 40 GB of pooled memory',
        '3 compute instances, each with 40 GB',
        '3 of the 7 compute slices and 40 GB of dedicated memory in one GPU instance',
        'Generation 3 MIG with a 40 GB cap',
      ],
      a: 2,
      why: 'Profiles read literally: **<n>g = compute slices out of 7**, **<m>gb = dedicated memory**. Two 3g.40gb instances fit on one H100 80GB.',
      distract: 'A profile describes one GPU instance on one GPU — not multiple GPUs, not multiple CIs, and not a hardware generation.',
    },
    {
      q: 'An admin runs `nvidia-smi mig -cgi 9,9` (no -C) and then `nvidia-smi -L` shows no MIG devices usable by CUDA. Why?',
      opts: [
        'Only GPU instances were created; a compute instance must be added with -cci (or use -C)',
        'MIG mode was never enabled; -cgi silently enables it',
        'Profile 9 is invalid on H100',
        'The node must be rebooted after -cgi before devices appear',
      ],
      a: 0,
      why: 'CUDA uses **compute instances**. `-cgi` alone creates only GIs; `-C` creates a default full-size CI in each, or you add CIs explicitly with `-cci`.',
      distract: '`-cgi` does not enable MIG — it fails if MIG is off. Profile 9 is 3g.40gb on H100 80GB. A reboot would actually **delete** the instances.',
    },
    {
      q: 'A MIG layout created with nvidia-smi disappears after every node reboot. What is the supported way to make it persistent?',
      opts: [
        'Enable persistence mode with nvidia-smi -pm 1',
        'Run nvidia-smi -i 0 -mig 1 again with the --permanent flag',
        'Save the layout with mlxconfig',
        'Describe the layout in nvidia-mig-parted (or the GPU Operator MIG Manager) and re-apply it at boot',
      ],
      a: 3,
      why: 'GI/CI instances are not persistent. **nvidia-mig-parted** (systemd at boot on bare metal) or the **GPU Operator MIG Manager** (node label `nvidia.com/mig.config`) re-creates the declared layout.',
      distract: '**Persistence mode** keeps the driver loaded but does not store MIG layouts. There is no `--permanent` flag; the MIG **mode** already persists. **mlxconfig** is a NIC tool.',
    },
    {
      q: 'Which statement about MIG isolation is correct?',
      opts: [
        'MIG shares memory between instances but isolates SMs',
        'Each GPU instance has dedicated SMs, memory, L2 cache slices and memory bandwidth, so one tenant cannot degrade another',
        'MIG is equivalent to time-slicing but with a fixed number of replicas',
        'MIG instances can communicate over NVLink, making them suitable for multi-GPU training',
      ],
      a: 1,
      why: 'MIG partitions compute **and** the memory system in hardware, giving predictable QoS and fault isolation per GPU instance.',
      distract: 'Memory is dedicated per GI (only CIs **within** a GI share memory). **Time-slicing** has no isolation. MIG devices have **no P2P/NVLink**.',
    },
    {
      q: 'A Slurm cluster has H100 nodes partitioned into 1g.10gb MIG devices, with gres.conf using AutoDetect=nvml. How does a user request one instance?',
      opts: [
        'srun --gpus=0.14',
        'srun --gres=gpu:1 --mig=on',
        'srun --constraint=mig',
        'srun --gres=gpu:1g.10gb:1',
      ],
      a: 3,
      why: 'With NVML autodetection Slurm exposes MIG devices as GRES whose **type is the profile name**, so jobs request `--gres=gpu:1g.10gb:1`.',
      distract: 'Slurm has no fractional GPU count or `--mig` option, and a node constraint does not allocate a MIG device.',
    },
  ],
}
