/**
 * Module 5 glossary — Troubleshoot and Optimize. Shared terms (xid, ecc, dcgm, nvsm,
 * sel, ipmi, redfish, nvidia-bug-report, mlxlink, gds, …) live in core.js.
 */
export default [
  /* ---------------- Monitoring & diagnostics ---------------- */
  { id: 'gpu-fell-off-bus', term: 'GPU fell off the bus (Xid 79)', cat: 'Monitoring & diagnostics',
    def: "The driver can no longer reach the GPU over PCIe: dmesg logs 'NVRM: Xid 79 … GPU has fallen off the bus' and nvidia-smi reports the GPU as lost or 'Unable to determine the device handle'. Causes include a hardware fault on the GPU, a PCIe/riser/baseboard problem, power delivery or overheating.",
    exam: 'Xid 79 is a hardware-class event. Drain the node, collect nvidia-bug-report / nvsm dump health, then cold-reset (power cycle via BMC). If it recurs on the same GPU, RMA it — do not simply reload the driver and return the node to service.' },

  { id: 'dcgm-health', term: 'DCGM health watches', cat: 'Monitoring & diagnostics',
    def: 'Passive, low-overhead background checks that DCGM runs on a GPU group (PCIe, memory/ECC, NVLink, thermal, power, InfoROM, driver). Enabled with dcgmi health -g <group> -s <systems> and queried with dcgmi health -g <group> -c.',
    exam: "Health watches are passive monitoring; dcgmi diag is an active test that needs the GPUs idle. 'Check continuously without disturbing jobs' → health watches; 'validate a GPU before returning it to service' → dcgmi diag -r 3." },

  { id: 'pcie-link-degraded', term: 'Degraded PCIe link (LnkSta vs. LnkCap)', cat: 'Monitoring & diagnostics',
    def: "lspci -vv shows a device's capability (LnkCap: e.g. Speed 32GT/s, Width x16) and its negotiated status (LnkSta). When LnkSta shows a lower speed or width, often flagged '(downgraded)', the link trained below spec — a seating, riser, cable, slot or device problem. PCIe AER (Advanced Error Reporting) messages in dmesg record corrected and uncorrected link errors.",
    exam: 'A GPU or NIC running at x8 or Gen3 instead of x16 Gen5 gives low bandwidth with no Xid. Compare LnkSta with LnkCap; rising AER correctable errors on the same device point at the physical link. Note that idle GPUs may drop link speed to save power — check under load.' },

  { id: 'ib-port-state', term: 'IB port state (ibstat)', cat: 'Fabric & networking',
    def: "ibstat reports each HCA port's logical State (Down, Initializing, Armed, Active), Physical state (Polling, LinkUp, Disabled) and Rate (e.g. 400 for NDR). Healthy compute ports show State: Active, Physical state: LinkUp at the expected rate.",
    exam: "Physical LinkUp but State Initializing → no subnet manager. Physical Polling/Down → cable, transceiver or far-end port. Active at a lower rate (e.g. 200 instead of 400) → mismatched or faulty cable/optic. A link flapping between states → check mlxlink and port error counters." },

  /* ---------------- Management & security ---------------- */
  { id: 'chassis-identify', term: 'Chassis identify LED', cat: 'Management & security',
    def: "A locator LED lit remotely through the BMC (ipmitool chassis identify <seconds> or 'force', or the Redfish IndicatorLED/LocationIndicatorActive property) so a technician can find the exact server in the rack. Many platforms also light per-component fault LEDs on failed PSUs, fans or drives.",
    exam: 'Before anyone pulls hardware, light the identify LED and confirm the serial number: pulling the wrong node or wrong GPU tray is a classic and expensive mistake.' },

  { id: 'hot-swap', term: 'Hot-swappable vs. cold-swap components', cat: 'Management & security',
    def: 'Hot-swappable parts (redundant PSUs, fan modules, front NVMe drives on most GPU servers) can be replaced with the system running. Cold-swap parts (GPU/HGX tray, motherboard tray, PCIe NICs, DIMMs, CPUs) require draining the node, shutting it down and removing power first.',
    exam: 'A failed redundant PSU or fan can be swapped live after confirming redundancy of the remaining units; a GPU or ConnectX card cannot. Always check the platform service manual — it is the authority on what is hot-swap.' },

  { id: 'rma', term: 'RMA (Return Merchandise Authorization)', cat: 'Management & security',
    def: 'The vendor process for replacing a failed part under warranty/support: open a case, attach diagnostic evidence (nvidia-bug-report, nvsm dump health, dcgmi diag results, SEL, serial numbers), receive the replacement, return the failed unit.',
    exam: 'Evidence first: NVIDIA Enterprise Support expects a bug report / NVSM dump and the part serial. Collect it before the reboot or reseat that may clear the state.' },

  /* ---------------- Cluster software ---------------- */
  { id: 'node-drain', term: 'Draining / cordoning a node', cat: 'Cluster software',
    def: "Removing a node from scheduling so no new work lands on it while current jobs finish. Slurm: scontrol update nodename=<n> state=drain reason='…' then state=resume to return it. Kubernetes: kubectl cordon (no new pods), kubectl drain (evict pods), kubectl uncordon.",
    exam: "First action once a hardware fault is confirmed on a production node, and the last step after validation is resume/uncordon. 'down' kills running jobs; 'drain' lets them finish." },

  /* ---------------- Compute & GPUs (platform tuning) ---------------- */
  { id: 'numa-nps', term: 'NUMA, NPS and Sub-NUMA Clustering', cat: 'Compute & GPUs',
    def: 'Non-Uniform Memory Access: memory and PCIe devices attach to a specific CPU socket or die region. AMD EPYC exposes NPS (NUMA nodes Per Socket: NPS0/1/2/4); Intel Xeon exposes Sub-NUMA Clustering (SNC off/2/4). More NUMA nodes = finer locality but more need for correct CPU/memory binding.',
    exam: "Set NPS/SNC as the server's NVIDIA-Certified configuration guide or DGX defaults specify, then bind each GPU's process to the NUMA node shown in nvidia-smi topo -m. Wrong-socket traffic shows up as lower host-to-device and GPUDirect bandwidth." },

  { id: 'cpu-affinity', term: 'CPU / NUMA affinity binding', cat: 'Compute & GPUs',
    def: "Pinning a process's threads and memory to the cores and NUMA node closest to its GPU and NIC, using numactl --cpunodebind/--membind, taskset, Slurm --cpu-bind / --gpu-bind, or container runtime cpusets. nvidia-smi topo -m prints each GPU's CPU and NUMA affinity.",
    exam: "One rank per GPU, each bound to the GPU's local NUMA node, is the standard pattern. Unbound processes that land on the far socket cross the inter-socket link (xGMI/UPI) for every copy." },

  { id: 'acs-iommu', term: 'PCIe ACS and IOMMU settings', cat: 'Compute & GPUs',
    def: 'Access Control Services on PCIe switches/root ports force peer-to-peer transactions up to the root complex for isolation; the IOMMU translates device DMA addresses. Both can break or slow GPU-to-GPU P2P and GPUDirect RDMA on bare metal.',
    exam: "For bare-metal GPUDirect P2P/RDMA: disable ACS on the PCIe switches (BIOS or setpci) and set the IOMMU to off or passthrough (iommu=pt / amd_iommu=on iommu=pt). Symptom of ACS left on: P2P bandwidth far below expected or NCCL falls back to going through the CPU. Virtualised hosts may need ACS/IOMMU on — follow the platform guide." },

  { id: 'bios-power-profile', term: 'BIOS performance profile & C-states', cat: 'Compute & GPUs',
    def: 'Server firmware settings that trade power for latency: system power profile (Performance vs. balanced/efficiency), deep CPU C-states, P-state/frequency governor, AMD Determinism and APBDIS, Intel Energy Performance Bias and Turbo. The OS equivalent is the cpufreq governor (cpupower frequency-set -g performance).',
    exam: 'For GPU/HPC nodes choose the maximum-performance profile, limit deep C-states where the platform guide recommends it, and use the performance governor — deep sleep states add wake-up latency that shows up as jitter in collectives and data loading.' },

  /* ---------------- Storage ---------------- */
  { id: 'raid-cache', term: 'DGX local NVMe cache (/raid)', cat: 'Storage',
    def: 'DGX systems ship several NVMe data drives configured as a software RAID 0 array mounted at /raid. It is intended as fast, non-redundant scratch/cache for datasets (and the backing store for FS-Cache), not as durable storage.',
    exam: 'RAID 0 = speed, no redundancy: losing one drive loses the array, so nothing irreplaceable lives on /raid. After an NVMe replacement the array must be recreated (DGX OS ships a script for this) and the cache repopulated.' },

  { id: 'fs-cache', term: 'FS-Cache / cachefilesd', cat: 'Storage',
    def: "The Linux kernel's local caching layer for network file systems. cachefilesd stores cached NFS file data on a local disk (on DGX, /raid); the NFS mount must include the fsc option to use it.",
    exam: "'Repeated epochs re-read the same dataset over NFS' → enable cachefilesd on the local NVMe RAID and mount with fsc. It helps re-reads, not the first read or writes." },

  { id: 'nfs-tuning', term: 'NFS client tuning (nconnect, rsize/wsize, RDMA)', cat: 'Storage',
    def: 'Mount options that raise NFS client throughput: nconnect=N opens several TCP connections per mount (up to 16), rsize/wsize set the transfer size (typically 1 MiB), proto=rdma (port 20049) uses NFS over RDMA, and jumbo frames (MTU 9000) on the storage network cut per-packet overhead.',
    exam: 'A single NFS TCP connection is a common bottleneck on 100–400 Gb/s links; nconnect or NFS-over-RDMA is the fix. MTU must match end-to-end (host, switch, filer) or you get fragmentation or silent drops.' },

  { id: 'rapids-cudf', term: 'RAPIDS cuDF', cat: 'Storage',
    def: 'Part of NVIDIA RAPIDS: a GPU DataFrame library with a pandas-like API for loading, filtering, joining and transforming tabular data on the GPU (also usable as a pandas accelerator via cudf.pandas).',
    exam: 'When the data-preparation/ETL stage, not training, is CPU-bound, moving it to the GPU with RAPIDS cuDF (and GPU data loading such as DALI) keeps GPUs fed.' },
]
