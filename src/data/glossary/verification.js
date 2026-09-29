/**
 * Module 4 glossary — Cluster Test and Verification.
 * Shared terms (nccl, busbw, hpl, burn-in, clusterkit, dcgm, mlxlink, ber, fio, gds…) live in core.js.
 */
export default [
  /* ---------------- Testing & benchmarks ---------------- */
  { id: 'dcgmi-diag', term: 'dcgmi diag run levels', cat: 'Testing & benchmarks',
    def: 'DCGM\'s active diagnostic. `-r 1` is a quick deployment/software sanity check (seconds); `-r 2` adds short PCIe, memory and bandwidth tests (minutes); `-r 3` adds targeted stress, targeted power, GEMM and memory-bandwidth tests (tens of minutes); `-r 4` adds extended memory tests and pulse tests (an hour or more). Individual tests can be run by name, e.g. `dcgmi diag -r targeted_power`.',
    exam: 'Longer level = deeper hardware coverage. -r 1 proves the stack is installed; -r 3 is the usual pre-production GPU validation; -r 4 is for burn-in or chasing an intermittent fault.' },

  { id: 'gpu-burn', term: 'gpu-burn', cat: 'Testing & benchmarks',
    def: 'A small open-source CUDA stress tool that runs continuous matrix multiplies on every GPU (e.g. `./gpu_burn -d 3600` for an hour in double precision) and compares results to detect computational errors.',
    exam: 'A "max heat, max power" single-node soak. It stresses the GPUs but does not test NVLink or the fabric — pair it with nvidia-smi monitoring of temperatures and clock-event reasons.' },

  { id: 'hpc-benchmarks', term: 'NGC HPC-Benchmarks container', cat: 'Testing & benchmarks',
    def: 'NVIDIA\'s NGC container (`nvcr.io/nvidia/hpc-benchmarks:<tag>`) with GPU-optimised HPL, HPL-MxP, HPCG and STREAM. HPL is launched through the `hpl.sh` wrapper with a `--dat` input file, one MPI rank per GPU.',
    exam: 'The supported way to run HPL on DGX/HGX: pull from NGC, run under Slurm with srun + Pyxis (or mpirun), one rank per GPU.' },

  { id: 'hpl-dat', term: 'HPL.dat parameters (N, NB, P, Q)', cat: 'Testing & benchmarks',
    def: 'The HPL input file. N = matrix order (sized to fill most of GPU memory), NB = block size (use NVIDIA\'s sample value for the GPU generation), P × Q = process grid, which must equal the number of MPI ranks (= GPUs). P ≤ Q and near-square is the usual choice.',
    exam: 'If P × Q ≠ ranks, HPL aborts or idles ranks. If N is too small the GPUs are under-fed and GFLOPS drop; too large and the run fails with out-of-memory.' },

  { id: 'hpl-residual', term: 'HPL residual check', cat: 'Testing & benchmarks',
    def: 'After solving Ax = b, HPL computes a scaled residual ||Ax − b|| / (ε · (||A||·||x|| + ||b||) · N) and prints PASSED if it is below the threshold (16.0) or FAILED otherwise.',
    exam: 'FAILED means the answer is numerically wrong — a hardware (GPU memory, compute, interconnect) problem — even when GFLOPS look normal. Never accept a fast run with a FAILED residual.' },

  { id: 'nccl-tests', term: 'nccl-tests', cat: 'Testing & benchmarks',
    def: 'NVIDIA\'s open-source NCCL benchmark suite (all_reduce_perf, all_gather_perf, reduce_scatter_perf, alltoall_perf, sendrecv_perf…). Built with `make MPI=1` for multi-node use. Key flags: -b/-e start/end size, -f step factor, -g GPUs per process, -n iterations, -c check correctness.',
    exam: 'Canonical single-node run: `all_reduce_perf -b 8 -e 16G -f 2 -g 8`. Multi-node: one rank per GPU with -g 1, launched by mpirun or srun. Read the out-of-place busbw at the largest sizes.' },

  { id: 'nccl-env', term: 'NCCL environment variables', cat: 'Testing & benchmarks',
    def: 'Runtime knobs read by NCCL: NCCL_DEBUG=INFO (log transports, rings, NICs chosen), NCCL_DEBUG_SUBSYS (filter), NCCL_IB_HCA (which HCAs/ports to use), NCCL_SOCKET_IFNAME (bootstrap interface), NCCL_TOPO_FILE (supply a topology XML), NCCL_IB_DISABLE / NCCL_P2P_DISABLE (isolate transports while debugging).',
    exam: 'First step when bandwidth is low: rerun with NCCL_DEBUG=INFO and confirm it uses NET/IB on every expected mlx5 device — not NET/Socket.' },

  { id: 'nvls', term: 'NVLink SHARP (NVLS)', cat: 'Fabric & networking',
    def: 'In-switch reduction offload on third-generation NVSwitch (H100/H200 and later): the NVSwitch performs part of the all-reduce arithmetic, raising achievable all-reduce bus bandwidth inside an NVLink domain. NCCL selects it automatically when available.',
    exam: 'Explains why single-node all_reduce busbw on HGX H100 can exceed the ring-algorithm figure. Seeing NVLS in NCCL_DEBUG=INFO output is healthy.' },

  { id: 'hpc-x', term: 'HPC-X', cat: 'Cluster software',
    def: 'NVIDIA\'s HPC software toolkit: Open MPI, UCX, UCC, SHARP (HCOLL) libraries, and the ClusterKit node/fabric assessment tool, pre-built and tuned for InfiniBand.',
    exam: 'ClusterKit ships inside HPC-X — "where do I get ClusterKit" is answered by HPC-X.' },

  { id: 'nemo-framework', term: 'NeMo Framework container', cat: 'Testing & benchmarks',
    def: 'NVIDIA\'s NGC container for training LLMs with Megatron-Core parallelism. Used for burn-in by running a real pretraining recipe (e.g. a Llama or GPT config, often with synthetic/mock data) across many nodes and watching step time, TFLOPS/GPU and loss.',
    exam: 'Objective 4.13. NeMo burn-in is the most realistic test: it mixes compute, NVLink, E/W fabric and storage. Look for stable step time and a decreasing, finite loss.' },

  /* ---------------- Fabric & networking ---------------- */
  { id: 'ibdiagnet', term: 'ibdiagnet', cat: 'Fabric & networking',
    def: 'The InfiniBand fabric-wide diagnostic from the ibutils2/MFT stack. Discovers the fabric from one host and checks links, speeds/widths, port counters, duplicate GUIDs/LIDs, routing, cable and PHY info and firmware versions. Results land in /var/tmp/ibdiagnet2/ (ibdiagnet2.log, .db_csv, .pm, .net_dump…).',
    exam: 'The one-command answer for "validate the whole IB fabric". Typical: clear counters (--pc), run traffic, rerun with -P all=1 to report every counter that incremented.' },

  { id: 'iblinkinfo', term: 'iblinkinfo', cat: 'Fabric & networking',
    def: 'Prints every switch port and what it is connected to, with link width and speed, e.g. `4X 106.25 Gbps Active/LinkUp` for NDR. Quickly exposes ports that trained at 1X/2X or at a lower speed (HDR instead of NDR).',
    exam: 'A link that is up but at 1X or HDR is a signal-quality or cable fault — the fabric works but at a fraction of the bandwidth.' },

  { id: 'ibnetdiscover', term: 'ibnetdiscover', cat: 'Fabric & networking',
    def: 'Walks the InfiniBand subnet and prints the discovered topology (every node, GUID and port-to-port connection). The output can be compared with the planned topology to find miswired or missing links.',
    exam: 'Cabling correctness (objective 4.5) = discovered topology matches the design. ibnetdiscover (or UFM/CVT) gives the "as-built"; diff it against the "as-designed" plan.' },

  { id: 'ib-port-counters', term: 'InfiniBand port counters', cat: 'Monitoring & diagnostics',
    def: 'Per-port PMA counters read with perfquery, ibdiagnet or UFM: SymbolErrorCounter, LinkErrorRecoveryCounter, LinkDownedCounter, PortRcvErrors, PortRcvRemotePhysicalErrors, PortXmitDiscards, and PortXmitWait (congestion, not errors).',
    exam: 'Rising symbol errors / link error recovery / link downed = physical layer (cable, transceiver, dirty connector). PortXmitWait alone = congestion, not a bad cable.' },

  { id: 'lldp', term: 'LLDP', cat: 'Fabric & networking',
    def: 'Link Layer Discovery Protocol: Ethernet devices advertise their system name and port to their neighbour. `lldpctl` on hosts or `nv show interface <port> lldp` / `show lldp neighbors` on switches reveals what is really plugged into each port.',
    exam: 'The Ethernet (RoCE, in-band, storage) equivalent of ibnetdiscover for verifying cabling against the plan.' },

  /* ---------------- Cables & optics ---------------- */
  { id: 'fec', term: 'FEC (forward error correction)', cat: 'Cables & optics',
    def: 'Error-correcting code (RS-FEC and variants) applied on high-speed PAM4 links such as HDR/NDR and 200/400G Ethernet. It corrects bit errors at the receiver, which is why raw (pre-FEC) BER can be non-zero while effective (post-FEC) BER is essentially zero.',
    exam: 'Judge a link by effective BER and uncorrectable/symbol errors. A high raw BER that is still inside the FEC budget is a warning; any post-FEC errors are a failure.' },

  { id: 'cable-validation-tool', term: 'Cable Validation Tool (UFM CVT)', cat: 'Cables & optics',
    def: 'NVIDIA\'s cable-validation capability (delivered with UFM) that takes the planned topology, runs agents on the switches, and reports per link whether it is correctly connected, miswired, missing, or has signal-quality problems — before the subnet manager brings the fabric into service.',
    exam: 'Named in the InfiniBand Cluster Bring-up Procedure. The answer when the question asks how to verify at scale that every cable is where the design says it should be.' },

  /* ---------------- Management & security ---------------- */
  { id: 'mlxfwmanager', term: 'mlxfwmanager', cat: 'Management & security',
    def: 'MFT tool that queries and updates firmware on NVIDIA adapters, DPUs and (in-band) switches. `mlxfwmanager --query` lists every device with its PSID, current and available FW version; `-u -i <image>` updates.',
    exam: 'Quickest single command to list firmware on every ConnectX/BlueField in a host. PSID must match the image, and FW is only active after a reset/reboot (or mlxfwreset).' },

  { id: 'switch-os', term: 'Switch OS (NVOS, Cumulus, MLNX-OS/Onyx)', cat: 'Management & security',
    def: 'Operating systems on NVIDIA switches: NVOS on managed Quantum InfiniBand switches (NVUE `nv show …` CLI), Cumulus Linux on Spectrum Ethernet (also NVUE), and the older MLNX-OS / Onyx (`show version`). Unmanaged (externally managed) IB switches have no OS — only firmware, queried in-band with flint/mlxfwmanager.',
    exam: 'Managed switch → log in and use the OS CLI (`nv show system`, `show version`). Unmanaged switch → `flint -d lid-<LID> q` or ibdiagnet/UFM from a host.' },

  { id: 'bfver', term: 'bfver', cat: 'Management & security',
    def: 'A utility on the BlueField Arm OS that prints the installed boot software versions — ATF, UEFI and the BSP/BFB release — so you can confirm which BFB bundle the DPU is running.',
    exam: 'Confirming BlueField-3 software = bfver (and DOCA package versions) on the DPU; confirming its NIC firmware = mlxfwmanager --query or flint q from the host or DPU.' },

  /* ---------------- Monitoring & diagnostics ---------------- */
  { id: 'clock-event-reasons', term: 'Clock event (throttle) reasons', cat: 'Monitoring & diagnostics',
    def: 'Flags reported by nvidia-smi (`-q -d PERFORMANCE`, or `clocks_event_reasons.*` / older `clocks_throttle_reasons.*` query fields) explaining why GPU clocks are below maximum: GPU idle, applications clocks, SW power cap, HW slowdown, HW thermal slowdown, HW power brake, SW thermal slowdown.',
    exam: 'SW power cap under HPL is expected. HW slowdown, HW thermal slowdown or HW power brake during a stress test point to cooling, power delivery or PSU problems.' },

  /* ---------------- Storage ---------------- */
  { id: 'gdsio', term: 'gdsio / gdscheck', cat: 'Storage',
    def: 'GPUDirect Storage utilities shipped with CUDA: `gdscheck -p` reports whether GDS and the file-system drivers are supported and configured; `gdsio` generates read/write load with a chosen transfer type (e.g. `-x 0` GPU direct, `-x 1` CPU only) to measure throughput into GPU memory.',
    exam: 'fio tests the file system through the CPU; gdsio tests the storage-to-GPU path. Run gdscheck first — if GDS is not enabled, gdsio silently measures a compatibility path.' },

  { id: 'dgx-raid-cache', term: 'DGX /raid local cache', cat: 'Storage',
    def: 'The DGX internal data NVMe drives are striped as a software RAID 0 (md array) mounted at /raid. It is scratch space and, with cachefilesd/FS-Cache, a read cache for NFS datasets. It has no redundancy.',
    exam: 'Check with `cat /proc/mdstat` and `df -h /raid`. A degraded or missing /raid (a failed NVMe) shows up as poor local read throughput in storage tests.' },
]
