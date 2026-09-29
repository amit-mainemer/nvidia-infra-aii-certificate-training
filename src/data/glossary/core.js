/**
 * Core glossary — terms shared across modules. Module-specific terms live in
 * the sibling files (bringup.js, physical.js, …). Categories used site-wide:
 *   Compute & GPUs · Fabric & networking · Cables & optics · Management & security
 *   Cluster software · Testing & benchmarks · Monitoring & diagnostics · Storage
 */
export default [
  /* ---------------- Compute & GPUs ---------------- */
  { id: 'dgx', term: 'DGX system', cat: 'Compute & GPUs',
    def: 'NVIDIA\'s integrated AI server (e.g. DGX H100/H200, DGX B200): eight SXM GPUs on an HGX baseboard, NVSwitch, ConnectX adapters, BlueField DPUs, NVMe cache and DGX OS, sold and supported as one appliance.',
    exam: 'Most procedures on the exam (firmware update, NVSM health, BMC setup) are written against DGX documentation. Know that a DGX has one BMC, dedicated compute-fabric ports and separate in-band/OOB management ports.' },

  { id: 'hgx', term: 'HGX baseboard', cat: 'Compute & GPUs',
    def: 'The NVIDIA GPU baseboard — 4 or 8 SXM GPUs plus NVSwitch chips — that OEMs (and DGX) build servers around. It has its own firmware components (GPU VBIOS, NVSwitch, FPGA/CPLD, HMC) that are updated as a bundle.',
    exam: 'Objective 1.4 calls out firmware upgrades "including on HGX systems". Expect questions about updating the HGX tray as a coordinated bundle rather than GPU by GPU.' },

  { id: 'sxm', term: 'SXM vs. PCIe GPU', cat: 'Compute & GPUs',
    def: 'SXM is NVIDIA\'s mezzanine GPU form factor mounted on an HGX board, with full NVLink bandwidth and higher power limits. PCIe GPUs are add-in cards that fit standard servers; they rely on PCIe (and optionally NVLink bridges) for GPU-to-GPU traffic.',
    exam: 'SXM = HGX/DGX, NVSwitch all-to-all, higher TDP. PCIe = NVIDIA-Certified mainstream servers, lower power, bridge-based NVLink at most.' },

  { id: 'nvidia-certified', term: 'NVIDIA-Certified Systems', cat: 'Compute & GPUs',
    def: 'OEM servers tested by NVIDIA for GPU, networking, security and management with a published configuration guide covering PCIe topology, slot placement, BIOS settings and GPU-to-NIC ratios.',
    exam: 'The configuration guide is the reference for "which slot, which BIOS setting" questions on non-DGX servers and for AMD/Intel optimisation.' },

  { id: 'mig', term: 'MIG (Multi-Instance GPU)', cat: 'Compute & GPUs',
    def: 'Hardware partitioning of an Ampere/Hopper/Blackwell data-center GPU into up to seven isolated GPU instances, each with dedicated SMs, L2 slices, memory and memory bandwidth.',
    exam: 'Know the sequence: enable MIG mode (nvidia-smi -mig 1, needs GPU reset), create GPU instances (GI), then compute instances (CI). MIG gives hardware isolation; time-slicing does not.' },

  { id: 'nvidia-smi', term: 'nvidia-smi', cat: 'Monitoring & diagnostics',
    def: 'The NVIDIA System Management Interface CLI, shipped with the driver. Queries and configures GPUs: utilisation, memory, temperature, power, clocks, ECC, persistence mode, MIG, topology (nvidia-smi topo -m) and NVLink status (nvidia-smi nvlink -s).',
    exam: 'The first tool in almost every validation and troubleshooting scenario. Memorise the subcommands for topology, NVLink, MIG, ECC and query output (-q, --query-gpu).' },

  { id: 'ecc', term: 'ECC & row remapping', cat: 'Compute & GPUs',
    def: 'GPU memory error correction. Correctable (single-bit) errors are fixed silently; uncorrectable (double-bit) errors kill the affected process. On A100/H100, faulty memory rows are remapped at the next GPU reset; pending or failed remaps indicate the GPU needs service.',
    exam: 'Rising volatile uncorrectable errors or a "row remapping failure" means replace/RMA the GPU. A pending remap means reset the GPU to apply it.' },

  { id: 'xid', term: 'Xid error', cat: 'Monitoring & diagnostics',
    def: 'An error code the NVIDIA driver writes to the kernel log (dmesg / syslog: "NVRM: Xid") when a GPU event occurs. Examples: 13/31/43 usually application faults, 48 double-bit ECC, 63/64 row-remapping events, 74 NVLink error, 79 GPU fell off the bus, 94/95 contained/uncontained ECC error.',
    exam: 'Triage by Xid: application-class Xids point at the workload; 48, 74, 79 and 95 point at hardware and usually mean drain the node and investigate or RMA.' },

  { id: 'persistence-mode', term: 'Persistence mode / nvidia-persistenced', cat: 'Compute & GPUs',
    def: 'Keeps the driver initialised on GPUs even when no process is using them, avoiding slow re-initialisation and preserving settings. On servers it is provided by the nvidia-persistenced daemon.',
    exam: 'Enabled on every compute node. A symptom like "first job after idle is slow" or "settings reset between jobs" points here.' },

  /* ---------------- Fabric & networking ---------------- */
  { id: 'nvlink', term: 'NVLink', cat: 'Fabric & networking',
    def: 'NVIDIA\'s high-bandwidth GPU-to-GPU interconnect. Hopper provides 18 links / 900 GB/s per GPU; Blackwell doubles that to 1.8 TB/s. Inside an HGX board NVLink runs through NVSwitch chips so every GPU can reach every other at full speed.',
    exam: 'Intra-node collective bandwidth (NCCL all-reduce inside one server) is an NVLink/NVSwitch test. Inactive links show up in nvidia-smi nvlink -s and as Xid 74.' },

  { id: 'nvswitch', term: 'NVSwitch & NVLink Switch', cat: 'Fabric & networking',
    def: 'NVSwitch chips on the HGX baseboard connect all GPUs in a node all-to-all over NVLink. The NVLink Switch system extends this outside the chassis (e.g. GB200 NVL72 racks) into a multi-node NVLink domain.',
    exam: 'Objective 4.3 is "single-node NCCL (including verify NVLink Switch)". NVSwitch-based systems need Fabric Manager running before CUDA jobs can use the GPUs.' },

  { id: 'fabric-manager', term: 'NVIDIA Fabric Manager', cat: 'Cluster software',
    def: 'A service (nvidia-fabricmanager) that configures NVSwitch routing on HGX/DGX systems. Its version must match the GPU driver version exactly.',
    exam: 'Classic fault: CUDA reports "system not yet initialized" or GPUs are unusable on an 8-GPU SXM system → Fabric Manager is stopped or its version mismatches the driver.' },

  { id: 'infiniband', term: 'InfiniBand (IB)', cat: 'Fabric & networking',
    def: 'A lossless, credit-based, RDMA-native network used for the compute (east-west) fabric in most NVIDIA AI clusters. NDR = 400 Gb/s per port, XDR = 800 Gb/s. Managed by a Subnet Manager.',
    exam: 'IB is the default answer for the GPU compute fabric in DGX SuperPOD. Know that an IB fabric will not pass traffic without a running subnet manager.' },

  { id: 'subnet-manager', term: 'Subnet Manager (SM / OpenSM)', cat: 'Fabric & networking',
    def: 'The InfiniBand control-plane process that discovers the fabric, assigns LIDs and computes routing tables. Runs on a managed switch, on UFM, or as OpenSM on a host; normally one master plus standbys.',
    exam: 'Ports stuck in "Initializing" (physical link up but logical state not Active) = no subnet manager reachable.' },

  { id: 'roce', term: 'RoCE (RDMA over Converged Ethernet)', cat: 'Fabric & networking',
    def: 'RDMA carried over Ethernet (RoCEv2 uses UDP/IP). Needs a lossless or congestion-managed network — PFC, ECN — as in NVIDIA Spectrum-X.',
    exam: 'Ethernet-based AI fabrics are RoCE. Poor RoCE performance usually points at missing PFC/ECN configuration or mismatched MTU.' },

  { id: 'rail-optimized', term: 'Rail-optimised topology', cat: 'Fabric & networking',
    def: 'A compute-fabric design where GPU n (and its NIC) in every server connects to the same leaf switch ("rail n"). Eight GPUs per node → eight rails. Most collective traffic stays within a rail, one hop away.',
    exam: 'The standard DGX SuperPOD compute fabric. Swapping two NIC cables between rails is a classic cabling fault that NCCL bandwidth tests reveal.' },

  { id: 'fat-tree', term: 'Fat-tree / leaf-spine', cat: 'Fabric & networking',
    def: 'A Clos network of leaf switches (servers attach here) and spine switches (leaves attach here), sized so bisection bandwidth is not oversubscribed (1:1 for AI compute fabrics).',
    exam: 'Know the four networks in an AI factory: compute (E/W, non-blocking fat-tree), storage, in-band management and out-of-band management.' },

  { id: 'east-west', term: 'East-west vs. north-south traffic', cat: 'Fabric & networking',
    def: 'East-west is server-to-server traffic inside the cluster (GPU collectives, storage). North-south is traffic entering or leaving the cluster (users, internet, corporate network).',
    exam: 'Objective 4.10: "Run NCCL to verify E/W fabric bandwidth" — the east-west fabric is the GPU compute network.' },

  { id: 'connectx', term: 'ConnectX SmartNIC', cat: 'Fabric & networking',
    def: 'NVIDIA\'s network adapter family (ConnectX-7 = 400 Gb/s NDR IB or 400 GbE; ConnectX-8 = 800 Gb/s). Each can run in InfiniBand or Ethernet mode, set with mlxconfig LINK_TYPE.',
    exam: 'A NIC in the wrong link mode (ETH instead of IB) is a classic bring-up fault; fix with mlxconfig and a reboot/reset.' },

  { id: 'bluefield', term: 'BlueField DPU', cat: 'Fabric & networking',
    def: 'A data processing unit: a ConnectX NIC plus Arm cores, memory and accelerators running its own OS (BFB image, DOCA). Offloads networking, storage and security from the host. BlueField-3 supports 400 Gb/s.',
    exam: 'Domain 2 in one line: install the BFB, pick the operating mode (DPU vs. NIC mode), manage it via rshim/OOB/BMC, and keep DOCA firmware consistent.' },

  { id: 'ufm', term: 'UFM (Unified Fabric Manager)', cat: 'Fabric & networking',
    def: 'NVIDIA\'s InfiniBand fabric management platform: subnet manager, topology discovery, port counters, telemetry, health reports and cable/firmware inventory.',
    exam: 'The at-scale answer for "monitor port counters across the whole IB fabric" or "find cables with rising symbol errors".' },

  { id: 'rdma', term: 'RDMA & GPUDirect', cat: 'Fabric & networking',
    def: 'Remote Direct Memory Access moves data between machines without the CPU copying it. GPUDirect RDMA lets the NIC read/write GPU memory directly; GPUDirect Storage does the same between storage and GPU memory.',
    exam: 'Why GPU-to-NIC PCIe placement (same PCIe switch / NUMA node) matters, and why nvidia-peermem must be loaded for GPUDirect RDMA.' },

  /* ---------------- Cables & optics ---------------- */
  { id: 'linkx', term: 'LinkX cables & transceivers', cat: 'Cables & optics',
    def: 'NVIDIA\'s interconnect product line: DAC (passive copper), ACC (active copper), AOC (active optical cables) and optical transceivers (OSFP, QSFP112, QSFP56) with multimode or single-mode fibre.',
    exam: 'Pick by reach: DAC ≲ 2–3 m inside a rack, ACC a little further, AOC/transceivers + fibre for row- and room-scale links.' },

  { id: 'ber', term: 'BER (bit error rate)', cat: 'Cables & optics',
    def: 'The ratio of errored bits to transmitted bits. Raw (pre-FEC) BER is expected to be non-zero; effective (post-FEC) BER and symbol errors should be at or near zero on a healthy link.',
    exam: 'Signal-quality validation (objective 4.4) is about BER and symbol-error counters: a link that trains up but shows rising symbol errors must be reseated, cleaned or replaced.' },

  /* ---------------- Management & security ---------------- */
  { id: 'bmc', term: 'BMC (Baseboard Management Controller)', cat: 'Management & security',
    def: 'An independent controller on the motherboard with its own network port and power. Provides remote power control, sensor readings, the event log, virtual console/media and firmware update — even when the host OS is down. Accessed via web UI, IPMI or Redfish.',
    exam: 'Step one of bring-up: give each BMC an OOB address, change the default credentials, check sensors and the SEL.' },

  { id: 'oob', term: 'Out-of-band (OOB) management', cat: 'Management & security',
    def: 'A separate, low-bandwidth management network for BMCs, switch management ports and PDUs, independent of the in-band data networks so hardware stays reachable when the host or fabric is broken.',
    exam: 'OOB is 1 GbE, isolated, and the first network brought up. If a question asks how to reach a hung server, the answer is via its BMC on the OOB network.' },

  { id: 'ipmi', term: 'IPMI & ipmitool', cat: 'Management & security',
    def: 'The Intelligent Platform Management Interface, the older standard for talking to a BMC. ipmitool can read sensors (sdr), the System Event Log (sel), power-cycle the host (chassis power) and configure the BMC LAN (lan set).',
    exam: 'ipmitool sel list and ipmitool sdr are the quickest way to spot PSU, fan and temperature events.' },

  { id: 'redfish', term: 'Redfish', cat: 'Management & security',
    def: 'The modern DMTF REST/JSON API for BMCs, replacing IPMI. Used for inventory, telemetry, firmware updates (UpdateService) and power control at scale.',
    exam: 'When the stem says "automate firmware updates or inventory across hundreds of BMCs", Redfish is the preferred interface.' },

  { id: 'tpm', term: 'TPM (Trusted Platform Module)', cat: 'Management & security',
    def: 'A hardware security chip that stores keys and measurements for measured/secure boot and disk encryption. Enabled and owned via BIOS/UEFI settings.',
    exam: 'Objective 1.3 groups TPM with BMC and OOB: it is part of initial platform configuration — enable it in BIOS before the OS is installed.' },

  { id: 'sel', term: 'SEL (System Event Log)', cat: 'Management & security',
    def: 'The BMC\'s persistent log of hardware events: PSU failures, fan faults, thermal trips, memory errors, chassis intrusion.',
    exam: 'For hardware faults the SEL is the evidence source that survives reboots and OS crashes.' },

  /* ---------------- Cluster software ---------------- */
  { id: 'bcm', term: 'Base Command Manager (BCM)', cat: 'Cluster software',
    def: 'NVIDIA\'s cluster manager (formerly Bright Cluster Manager). Provisions nodes from software images over PXE, manages categories, networks and interfaces, deploys Slurm/Kubernetes, and monitors health. Administered with cmsh or Base View.',
    exam: 'Domain 3 is largely BCM: install the head node, configure HA with a second head node, define categories and interfaces, then deploy Slurm with Enroot/Pyxis.' },

  { id: 'slurm', term: 'Slurm', cat: 'Cluster software',
    def: 'The open-source HPC workload manager used on DGX SuperPOD: slurmctld (controller), slurmd (per node), partitions, GRES (gres/gpu) for GPU scheduling, and srun/sbatch/salloc to launch jobs.',
    exam: 'Know GPU requests (--gpus, --gres=gpu:8), node states (idle, alloc, drain, down) and how to drain a faulty node (scontrol update nodename=X state=drain reason=...).' },

  { id: 'enroot', term: 'Enroot', cat: 'Cluster software',
    def: 'NVIDIA\'s tool that turns container images into unprivileged sandboxes — no daemon, no root — suitable for multi-user HPC nodes.',
    exam: 'Enroot + Pyxis is how containers run under Slurm on SuperPOD; Docker is used on standalone nodes.' },

  { id: 'pyxis', term: 'Pyxis', cat: 'Cluster software',
    def: 'A Slurm SPANK plugin that adds --container-image and --container-mounts to srun, using Enroot underneath.',
    exam: 'srun --container-image=nvcr.io#nvidia/pytorch:xx.xx-py3 ... is the canonical "run an NGC container under Slurm" command.' },

  { id: 'ngc', term: 'NGC catalog & NGC CLI', cat: 'Cluster software',
    def: 'NVIDIA GPU Cloud: the registry of GPU-optimised containers (nvcr.io), models and resources. The ngc CLI authenticates with an API key (ngc config set) and downloads assets.',
    exam: 'Objective 3.7: install the NGC CLI on hosts. Docker logs in to nvcr.io with username $oauthtoken and the API key as password.' },

  { id: 'container-toolkit', term: 'NVIDIA Container Toolkit', cat: 'Cluster software',
    def: 'Packages (nvidia-container-toolkit, nvidia-ctk) that let container runtimes (Docker, containerd, CRI-O) expose GPUs to containers. Configured with nvidia-ctk runtime configure --runtime=docker.',
    exam: 'Validation command: docker run --rm --gpus all ubuntu nvidia-smi. "could not select device driver" means the toolkit is missing or Docker was not restarted.' },

  { id: 'doca', term: 'DOCA', cat: 'Cluster software',
    def: 'NVIDIA\'s SDK and runtime for BlueField and ConnectX: DOCA-Host (the host driver stack that replaced MLNX_OFED) and the BlueField OS/BFB bundles.',
    exam: 'Objective 3.4 "install/update/remove NVIDIA GPU and DOCA drivers" — DOCA-Host is the network driver stack on hosts.' },

  { id: 'dgx-os', term: 'DGX OS', cat: 'Cluster software',
    def: 'NVIDIA\'s Ubuntu-based OS image for DGX systems, pre-integrated with the GPU driver, Fabric Manager, DOCA/OFED, NVSM, DCGM and the container toolkit.',
    exam: 'Installing DGX OS (or the DGX software stack on Ubuntu/RHEL) is the "install OS" objective for DGX nodes.' },

  /* ---------------- Testing & benchmarks ---------------- */
  { id: 'nccl', term: 'NCCL', cat: 'Testing & benchmarks',
    def: 'The NVIDIA Collective Communications Library: all-reduce, all-gather, reduce-scatter, broadcast and all-to-all across GPUs over NVLink, PCIe, InfiniBand and RoCE. nccl-tests (all_reduce_perf, etc.) measure its bandwidth.',
    exam: 'The main tool of Domain 4. Single-node tests validate NVLink/NVSwitch; multi-node tests validate the E/W fabric. Read the busbw column, not algbw.' },

  { id: 'busbw', term: 'busbw vs. algbw', cat: 'Testing & benchmarks',
    def: 'nccl-tests report algorithm bandwidth (data size ÷ time) and bus bandwidth (algbw scaled by the collective\'s communication factor, e.g. 2(n−1)/n for all-reduce). busbw is comparable to hardware link speed and independent of GPU count.',
    exam: 'Compare busbw with the expected NVLink or NIC line rate. A node whose busbw is well below its peers has a bad link, GPU or NIC.' },

  { id: 'hpl', term: 'HPL (High-Performance Linpack)', cat: 'Testing & benchmarks',
    def: 'The dense linear-algebra benchmark behind the TOP500 list. NVIDIA ships a GPU-optimised HPL in the HPC-Benchmarks NGC container. Stresses GPU compute, memory, power and cooling; reports GFLOPS and a residual check (must PASS).',
    exam: 'Objectives 4.2 and 4.12: run HPL for performance and repeat it for burn-in. A FAILED residual means wrong results — a hardware problem even if the GFLOPS look good.' },

  { id: 'burn-in', term: 'Burn-in', cat: 'Testing & benchmarks',
    def: 'Running sustained, heavy workloads (HPL, NCCL, NeMo training) for hours to shake out infant-mortality failures, thermal issues and marginal links before handing the cluster to users.',
    exam: 'Burn-in is about duration and stability, not peak numbers: a node that throttles, throws Xids or drops links during burn-in is pulled from the pool.' },

  { id: 'clusterkit', term: 'ClusterKit', cat: 'Testing & benchmarks',
    def: 'An NVIDIA (HPC-X) multi-faceted node and fabric assessment tool: runs bandwidth and latency tests between node pairs, GPU and memory checks, and reports outliers across the cluster.',
    exam: 'Objective 4.9: "Run ClusterKit to perform a multifaceted node assessment" — use it to find the outlier node or link in a large pool rather than eyeballing individual tests.' },

  { id: 'perftest', term: 'perftest (ib_write_bw / ib_write_lat)', cat: 'Testing & benchmarks',
    def: 'Low-level RDMA benchmarks run between two hosts: ib_write_bw, ib_read_bw, ib_send_bw for bandwidth and ib_write_lat etc. for latency. Useful to isolate a single NIC or link from NCCL.',
    exam: 'When NCCL shows one slow node, point-to-point ib_write_bw on each rail pinpoints which NIC/cable is at fault.' },

  /* ---------------- Monitoring & diagnostics ---------------- */
  { id: 'dcgm', term: 'DCGM (Data Center GPU Manager)', cat: 'Monitoring & diagnostics',
    def: 'NVIDIA\'s GPU fleet management suite: health monitoring, policies, telemetry (dcgm-exporter for Prometheus) and active diagnostics via dcgmi diag at levels 1 (seconds) to 3/4 (long stress).',
    exam: 'dcgmi diag -r 3 is the standard GPU hardware validation. Level 1 is a quick sanity check; higher levels stress PCIe, memory and compute.' },

  { id: 'nvsm', term: 'NVSM (NVIDIA System Management)', cat: 'Monitoring & diagnostics',
    def: 'DGX system-level health tool: nvsm show health, nvsm dump health (creates a support bundle), and inventory of GPUs, drives, PSUs, fans and NICs.',
    exam: 'On a DGX, "check overall system health" or "collect logs for NVIDIA support" → nvsm show health / nvsm dump health.' },

  { id: 'nvidia-bug-report', term: 'nvidia-bug-report.sh', cat: 'Monitoring & diagnostics',
    def: 'Script shipped with the driver that gathers driver state, dmesg, nvidia-smi output and configuration into nvidia-bug-report.log.gz for support cases.',
    exam: 'Collect it (or nvsm dump health on DGX) before opening an RMA or support case.' },

  { id: 'mlxlink', term: 'MFT tools (mlxlink, mlxconfig, flint)', cat: 'Monitoring & diagnostics',
    def: 'NVIDIA Firmware Tools for ConnectX/BlueField/switches: mlxlink shows link state, speed, BER and eye; mlxconfig sets persistent NIC parameters; flint/mlxfwmanager query and burn firmware.',
    exam: 'mlxlink -d <dev> -c (and --show_ber / eye) is the per-port signal-quality check; flint -d <dev> q shows the firmware version.' },

  /* ---------------- Storage ---------------- */
  { id: 'gds', term: 'GPUDirect Storage (GDS)', cat: 'Storage',
    def: 'A direct DMA path between storage (local NVMe or network file systems) and GPU memory, bypassing the CPU bounce buffer. Tested with gdsio; checked with gdscheck.',
    exam: 'Storage-throughput scenarios for data loading often point at GDS plus a parallel file system.' },

  { id: 'parallel-fs', term: 'Parallel file system', cat: 'Storage',
    def: 'A shared file system that stripes data across many storage servers for high aggregate bandwidth — Lustre, IBM Storage Scale (GPFS), WEKA, VAST, DDN EXAScaler — typically mounted over the storage fabric.',
    exam: 'Third-party storage (objective 1.11) is usually one of these; know that client tuning (mount options, RDMA, number of connections) matters as much as the array.' },

  { id: 'fio', term: 'fio', cat: 'Storage',
    def: 'The Flexible I/O tester: generates configurable read/write workloads (block size, queue depth, jobs, direct I/O) to measure storage bandwidth, IOPS and latency.',
    exam: 'Objective 4.14 "test storage": fio for file systems/NVMe, gdsio for the GPUDirect path. Use direct=1 and large block sizes for throughput tests.' },
]
