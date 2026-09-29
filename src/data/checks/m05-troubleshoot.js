// End-of-lesson comprehension checks for Module 5: Troubleshoot and Optimize. Keyed by lesson id.
export default {
  'fault-identification': [
    {
      q: "A job crashes with Xid 13 on GPU 0000:1b:00.0. Over the next week the same Xid appears on four different GPUs in three nodes, always while running the same user's container. What is the most likely cause?",
      opts: [
        "The user's application or container (a software fault)",
        'A failing GPU at bus 0000:1b:00.0',
        'An NVLink fault on the HGX baseboard',
        'A PSU losing redundancy',
      ],
      a: 0,
      why: "Xid 13 is usually application-class. When it **follows the job** across different GPUs and nodes, the workload is the common factor, not any single GPU.",
      distract: "A failing GPU would produce errors on **that** GPU with any job. NVLink faults are Xid 74; PSU issues show in the BMC SEL.",
    },
    {
      q: "A GPU shows 'HW Power Brake Slowdown: Active' during HPL. Which evidence source should you check next?",
      opts: [
        'nvidia-smi -q -d ECC',
        'ibstat on the compute NICs',
        'The NCCL debug log',
        'BMC power supply sensors and SEL (ipmitool sdr type "Power Supply")',
      ],
      a: 3,
      why: "Power brake is a platform-asserted slowdown usually tied to power delivery — a failed PSU or insufficient power. PSU state and power events live in the BMC.",
      distract: "**ECC**, **ibstat** and **NCCL logs** do not report power delivery problems.",
    },
    {
      q: "lspci -vv for a GPU under load shows 'LnkCap: Speed 32GT/s, Width x16' and 'LnkSta: Speed 32GT/s, Width x8 (downgraded)'. What is the implication?",
      opts: [
        'The GPU is in a power-saving state and this is expected under load',
        'The link trained at half its lanes — a seating, riser, slot or device problem that halves PCIe bandwidth',
        'The GPU needs a row remap applied',
        'The driver version is too old for PCIe Gen5',
      ],
      a: 1,
      why: "LnkSta below LnkCap under load means the link negotiated fewer lanes. It cuts host-to-device and GPUDirect bandwidth without any Xid; reseat and compare with a peer node's slot.",
      distract: "Idle power saving lowers **speed**, and the check here is under load with width reduced. Row remapping concerns memory, and the driver does not choose lane width.",
    },
    {
      q: 'You must tell a technician exactly which GPU to pull from a server in a rack of identical nodes. What is the best information to give?',
      opts: [
        'The nvidia-smi index of the GPU (e.g. GPU 3)',
        'The CUDA device number used by the failing job',
        'The GPU serial number and PCI bus ID mapped to the physical slot from the service manual, with the chassis identify LED lit',
        'The hostname only; the technician can find the GPU by its fault LED',
      ],
      a: 2,
      why: "Serial number and bus ID are unambiguous; the service manual maps them to physical positions, and the identify LED finds the right chassis.",
      distract: "The **nvidia-smi index** and **CUDA device number** are enumeration orders that need not match physical slot labels. Not every GPU fault lights an LED.",
    },
    {
      q: "Which pair correctly distinguishes DCGM health watches from dcgmi diag?",
      opts: [
        'Health watches are passive background checks safe on busy GPUs; dcgmi diag runs active tests and needs the GPUs idle',
        'Health watches run stress tests; dcgmi diag only reads counters',
        'Both are passive and can run during production jobs',
        'Health watches work only on DGX; dcgmi diag works on any server',
      ],
      a: 0,
      why: "Health watches monitor PCIe, memory, NVLink, thermal and power continuously with low overhead. dcgmi diag actively exercises the GPUs, so it runs on a drained or idle node.",
      distract: "The roles are reversed in the second option, diag is not passive, and DCGM is not DGX-specific.",
    },
  ],

  'component-replacement': [
    {
      q: "A node is still running jobs but has logged a hardware Xid. You want current jobs to finish and no new jobs to start. Which Slurm command fits?",
      opts: [
        'scontrol update nodename=dgx-a07 state=down',
        'scontrol update nodename=dgx-a07 state=resume',
        'scancel --nodelist=dgx-a07',
        'scontrol update nodename=dgx-a07 state=drain reason="Xid 79 GPU 1b:00.0 case#123"',
      ],
      a: 3,
      why: "**drain** lets running jobs finish and blocks new ones; the reason records why for other admins and the support case.",
      distract: "**down** takes the node out immediately and its jobs are lost. **resume** returns it to service. **scancel** kills jobs without stopping new ones.",
    },
    {
      q: "On a DGX, what should you collect for NVIDIA Enterprise Support before power-cycling a node with a GPU fault?",
      opts: [
        'An nvsm dump health bundle (or nvidia-bug-report.sh) plus the system and part serial numbers',
        'A screenshot of the Slurm queue',
        'The output of nvidia-smi -L only',
        'Nothing; logs are regenerated after reboot',
      ],
      a: 0,
      why: "The NVSM dump (or nvidia-bug-report on non-DGX) captures driver state, logs, nvidia-smi output and health; a power cycle can clear the failure state, so collect first.",
      distract: "The **Slurm queue** and **nvidia-smi -L** lack diagnostic depth, and volatile state is **lost** on reboot.",
    },
    {
      q: 'Which component is normally a hot-swap replacement on a DGX system?',
      opts: [
        'A ConnectX network card',
        'A DIMM',
        'A redundant power supply',
        'The HGX GPU tray',
      ],
      a: 2,
      why: "Redundant PSUs (and fan modules and front NVMe drives) are designed to be replaced with the system running, after confirming the remaining units can carry the load.",
      distract: "**NICs**, **DIMMs** and the **GPU tray** are cold-swap: shut down, remove power, ESD precautions, follow the service manual.",
    },
    {
      q: 'A replacement GPU tray has been installed. Why check firmware before running validation?',
      opts: [
        'Because dcgmi diag refuses to run on new hardware',
        'Replacement parts ship with whatever firmware was on the shelf; mismatches with the fleet cause subtle faults',
        'Firmware updates are required to clear the BMC SEL',
        'The new tray always ships with firmware newer than the driver supports',
      ],
      a: 1,
      why: "Aligning VBIOS/HGX (and NIC) firmware with the fleet baseline avoids inconsistent behaviour across nodes; the validation that follows then tests the configuration you actually run.",
      distract: "dcgmi diag runs regardless, the SEL is cleared separately, and shipped firmware may be older or newer — the point is **alignment**.",
    },
    {
      q: 'Which sequence correctly finishes a GPU replacement?',
      opts: [
        'dcgmi diag -r 3 → single-node NCCL → HPL → scontrol update state=resume',
        'scontrol update state=resume → dcgmi diag -r 1 during production',
        'nvidia-smi shows the GPU → kubectl uncordon',
        'Clear the SEL → reboot → resume',
      ],
      a: 0,
      why: "Validate under stress (DCGM level 3), over NVLink/NVSwitch (NCCL) and at full power (HPL) **before** returning the node to service.",
      distract: "Every other option returns the node before a meaningful stress validation.",
    },
  ],

  optimization: [
    {
      q: "nvidia-smi topo -m shows GPU0 and NIC0 as PIX, and NUMA Affinity 0 for GPU0. An MPI rank using GPU0 runs slower than its peers and top shows it on cores of socket 1. What is the fix?",
      opts: [
        'Enable deeper C-states on socket 1',
        'Bind the rank to NUMA node 0 (numactl --cpunodebind=0 --membind=0 or Slurm --cpu-bind / --gpu-bind=closest)',
        'Move the NIC to a different slot',
        'Disable persistence mode',
      ],
      a: 1,
      why: "The rank is running on the far socket, so every host copy crosses the inter-socket link. Binding it to GPU0's NUMA node restores locality.",
      distract: "**C-states** add latency, the **NIC placement** is already ideal (PIX), and **persistence mode** should stay on.",
    },
    {
      q: 'Which BIOS/OS combination is generally recommended for bare-metal GPUDirect P2P and RDMA performance?',
      opts: [
        'ACS enabled on PCIe switches, IOMMU in full translation mode',
        'ACS enabled, IOMMU off',
        'Deep C-states enabled, powersave governor',
        'ACS disabled on PCIe switches, IOMMU off or iommu=pt',
      ],
      a: 3,
      why: "ACS forces P2P traffic up to the root complex; IOMMU translation adds overhead. Disabling ACS and using passthrough (or off) keeps GPU↔NIC and GPU↔GPU traffic under the PCIe switch.",
      distract: "Leaving **ACS enabled** is the classic cause of poor P2P bandwidth, and **deep C-states / powersave** hurt latency.",
    },
    {
      q: "What does the 'fsc' NFS mount option do on a DGX with cachefilesd configured on /raid?",
      opts: [
        'Enables FS-Cache so NFS file data is cached on the local NVMe RAID for faster re-reads',
        'Forces synchronous commits for crash safety',
        'Enables NFS over RDMA',
        'Opens multiple TCP connections per mount',
      ],
      a: 0,
      why: "fsc tells the NFS client to use FS-Cache; cachefilesd stores the cached data on the configured local directory, speeding up repeated reads across epochs.",
      distract: "**Synchronous commits** is 'sync', **RDMA** is proto=rdma, and **multiple connections** is nconnect.",
    },
    {
      q: 'Jumbo frames (MTU 9000) were enabled on the storage NICs of all GPU nodes, and NFS throughput became worse with occasional hangs on large reads. What is the most likely cause?',
      opts: [
        'Jumbo frames always reduce NFS throughput',
        'The rsize was set too large for jumbo frames',
        'A switch port or the filer is still at MTU 1500, so the MTU is not consistent end to end',
        'FS-Cache is incompatible with jumbo frames',
      ],
      a: 2,
      why: "MTU must match on every hop — host, switch and storage. A mismatch leads to dropped or fragmented large frames, which looks like stalls on large transfers.",
      distract: "Consistent jumbo frames **help** throughput; rsize and FS-Cache are unrelated to frame size.",
    },
    {
      q: "GPU utilisation during training alternates between 100% and long idle gaps at every batch boundary. Storage benchmarks with fio show the filer is far from saturated. What is the best first optimisation?",
      opts: [
        'Replace the storage system with a faster parallel file system',
        'Increase data loader parallelism (more workers, pinned memory, prefetch) or move preprocessing to the GPU with DALI / RAPIDS cuDF',
        'Enable MIG to share the GPU with the data loader',
        'Lower the GPU power limit so the GPU waits less',
      ],
      a: 1,
      why: "If storage has headroom, the input pipeline on the host is the bottleneck. More loader workers, prefetching or GPU-accelerated preprocessing keep the GPU fed.",
      distract: "**Faster storage** does not help when storage is not the limit. **MIG** and a **lower power limit** do not speed up data preparation.",
    },
  ],
}
