export default {
  id: 'verification',
  n: 4,
  domain: 'verification',
  weight: 33,
  title: 'Cluster Test and Verification',
  blurb: 'The largest domain: prove a freshly built AI cluster works — GPU stress and HPL, NCCL over NVLink and the east-west fabric, cable and signal-quality validation, firmware/software confirmation, ClusterKit, NeMo burn-in and storage tests — and read the output like an acceptance engineer.',
  hours: '7–9 h',
  lessons: [
    /* ------------------------------------------------------------------ */
    {
      id: 'single-node-hpl',
      title: 'Single-node stress tests, HPL and HPL burn-in',
      minutes: 15,
      blocks: [
        { t: 'lede', x: 'Verification starts inside one box. Before any multi-node test means anything, every node must pass GPU diagnostics, survive a sustained stress without throttling or errors, and deliver HPL performance in line with its peers — with a PASSED residual. Objectives 4.1, 4.2 and 4.12.' },

        { t: 'h2', x: 'Where single-node testing sits in the validation flow' },
        { t: 'flow', steps: [
          { b: '1 · Health snapshot', s: '`nvidia-smi`, [[nvsm|nvsm show health]], [[fabric-manager|Fabric Manager]] running, no [[xid|Xid]] errors in `dmesg`.' },
          { b: '2 · GPU diagnostics', s: '[[dcgmi-diag|dcgmi diag -r 3]] (or -r 4 for burn-in) on every node.' },
          { b: '3 · Stress + monitor', s: 'Targeted stress/power, [[gpu-burn|gpu-burn]] while watching clocks, temps, power and [[clock-event-reasons|clock event reasons]].' },
          { b: '4 · Single-node HPL', s: '[[hpc-benchmarks|HPC-Benchmarks]] container, 8 ranks, compare GFLOPS across nodes, residual PASSED.' },
          { b: '5 · HPL burn-in', s: 'Repeat for hours; reject nodes that fail, throttle or drift.' },
          { b: '6 · Then multi-node', s: 'Only healthy nodes go on to NCCL, ClusterKit and NeMo tests.' },
        ]},
        { t: 'callout', kind: 'exam', title: 'Why the order matters', x: 'Multi-node tests are only as fast as the slowest participant. If you skip single-node validation, one bad GPU turns into a mysteriously slow 64-node NCCL or HPL run that takes hours to bisect. The exam rewards "isolate at the smallest scope first".' },

        { t: 'h2', x: 'Pre-flight health checks' },
        { t: 'code', lang: 'bash', title: 'Quick sanity on each node', x: `nvidia-smi                          # 8 GPUs, driver/CUDA version, no ERR!, persistence on
nvidia-smi -q | grep -iA2 "fabric"  # H100+: Fabric State "Completed", Status "Success"
systemctl status nvidia-fabricmanager   # must be active on NVSwitch (HGX/DGX) systems
nvidia-smi topo -m                  # GPU<->GPU should read NV18 on HGX H100
sudo nvsm show health               # DGX: overall Healthy, lists failed components
dmesg -T | grep -i xid              # any Xid is a finding to explain before stressing` },

        { t: 'h2', x: 'DCGM diagnostics — the run levels' },
        { t: 'p', x: '[[dcgm|DCGM]]\'s `dcgmi diag` is the NVIDIA-supported GPU hardware validation. Each run level is a superset of the one below. Times are approximate and depend on GPU model and count.' },
        { t: 'table', head: ['Level', 'Approx. duration', 'Adds', 'Use it for'], rows: [
          ['`-r 1` (short)', 'Seconds', 'Deployment checks: driver/library presence, permissions, persistence, environment', 'Is the software stack sane?'],
          ['`-r 2` (medium)', 'A few minutes', 'PCIe/NVLink bandwidth, short memory and integration tests', 'Quick post-install or post-repair check'],
          ['`-r 3` (long)', 'Tens of minutes', 'Targeted stress, targeted power, diagnostic (GEMM), memory bandwidth', 'Standard pre-production validation'],
          ['`-r 4` (extended)', 'An hour or more', 'Extended memory test (memtest), pulse test and longer stress', 'Burn-in, chasing intermittent faults'],
        ]},
        { t: 'code', lang: 'bash', title: 'dcgmi diag in practice', x: `dcgmi discovery -l                     # GPUs DCGM can see
dcgmi diag -r 3                        # all GPUs, long diagnostic
dcgmi diag -r 3 -j > diag-$(hostname).json   # JSON for automated pass/fail collection
dcgmi diag -r 4 -i 0,1                 # extended, only GPUs 0 and 1
dcgmi diag -r targeted_power           # run one named test
dcgmi diag -r targeted_stress -p targeted_stress.test_duration=600` },
        { t: 'callout', kind: 'trap', title: 'Reading dcgmi output', x: [
          'Every test reports **Pass / Fail / Skip / Warn** per GPU. A **Skip** is not a pass — e.g. a test skipped because another process held the GPU. Stop other GPU workloads (and on DGX, consider stopping services that hold GPUs) before running long levels.',
          'A single **Fail** on one GPU (memory, PCIe, thermal) is enough to pull the node: the rest of the validation cannot be trusted with it in the pool.',
        ]},

        { t: 'h2', x: 'Stressing a node and watching it' },
        { t: 'p', x: 'Stress tests push the GPUs to full power so latent faults surface: marginal memory, bad thermal interface, a weak PSU, blocked airflow or a slow fan. Options range from DCGM\'s own targeted tests to [[gpu-burn|gpu-burn]], `dcgmproftester` (generates tensor-core load) and HPL itself. On DGX, NVSM also offers a combined stress test (`nvsm stress-test`).' },
        { t: 'code', lang: 'bash', title: 'Generate load, then watch it from a second shell', x: `# Load options
./gpu_burn -d 3600                     # 1 h double-precision burn on all GPUs
dcgmproftester12 --no-dcgm-validation -t 1004 -d 600   # 10 min tensor-core load

# Monitoring
nvidia-smi dmon -s pucvmet -d 5        # power, util, clocks, violations, mem, ECC, temp
nvidia-smi --query-gpu=index,temperature.gpu,temperature.memory,power.draw,clocks.sm,\\
clocks_event_reasons.active --format=csv -l 5
nvidia-smi -q -d PERFORMANCE           # human-readable clock event (throttle) reasons
nvidia-smi -q -d ECC | grep -i -A3 "volatile"` },
        { t: 'table', head: ['What you see during stress', 'Interpretation', 'Action'], rows: [
          ['SM clock steady, **SW Power Cap** active', 'Normal — the GPU is at its power limit and managing clocks', 'None'],
          ['**HW Thermal Slowdown** or GPU/HBM temp climbing to the slowdown threshold', 'Cooling problem: airflow, fan, heatsink contact, inlet temperature', 'Check fans, blanking panels, rack inlet temp, liquid loop'],
          ['**HW Power Brake Slowdown** / **HW Slowdown**', 'External power signal asserted — PSU fault, power capping by BMC', 'Check PSUs, BMC power events and SEL'],
          ['One GPU clocks consistently lower than the other seven', 'That GPU or its cooling is marginal', 'Swap/RMA candidate; rerun dcgmi diag -r 4'],
          ['Volatile correctable ECC rising, row remapping pending', 'HBM degrading', 'Reset GPU to remap; replace if it continues'],
          ['[[xid|Xid]] 79 ("fallen off the bus") / 48 (DBE) / 94–95 (contained/uncontained ECC)', 'Hardware error', 'Pull node, collect [[nvidia-bug-report|nvidia-bug-report.sh]]'],
        ]},
        { t: 'callout', kind: 'exam', title: 'Power cap vs. slowdown', x: 'The exam likes this distinction. **SW Power Cap** during a heavy test is expected behaviour. **HW** slowdowns (thermal, power brake) mean the platform could not sustain the load — a facility, cooling or PSU finding, not a tuning issue.' },

        { t: 'h2', x: 'HPL from the NGC HPC-Benchmarks container' },
        { t: 'p', x: '[[hpl|HPL]] solves a dense linear system in FP64 and is the de facto "all GPUs at full power, all memory in use" workload. NVIDIA publishes a GPU-optimised build in the [[hpc-benchmarks|HPC-Benchmarks]] container on [[ngc|NGC]]. You run it with the `hpl.sh` wrapper, one MPI rank per GPU, pointing at an input (`.dat`) file.' },
        { t: 'h3', x: 'Choosing the HPL.dat parameters' },
        { t: 'specs', rows: [
          ['N (problem size)', 'Size to fill most GPU memory: N ≈ √(fraction × total GPU memory in bytes ÷ 8). For 8 × 80 GB with ~80 % use: √(0.8 × 640e9 ÷ 8) ≈ 250,000. Round to a multiple of NB.'],
          ['NB (block size)', 'Use the value from NVIDIA\'s sample .dat for your GPU generation (GPU HPL uses large blocks — hundreds to ~1,000). Do not copy CPU-era values like 192.'],
          ['P × Q (process grid)', 'Must equal the number of ranks = number of GPUs. Near-square with P ≤ Q: 8 GPUs → 2 × 4; 32 GPUs (4 nodes) → 4 × 8.'],
          ['Ns / NBs / grids count', 'Keep to one N, one NB, one grid per run so each line of output is comparable.'],
        ]},
        { t: 'code', lang: 'text', title: 'Relevant lines of an 8-GPU HPL.dat', x: `1            # of problems sizes (N)
250368       Ns
1            # of NBs
576          NBs            <- take from NVIDIA's sample for your GPU
0            PMAP process mapping (0=Row-,1=Column-major)
1            # of process grids (P x Q)
2            Ps
4            Qs             <- P x Q = 8 = GPUs = MPI ranks
16.0         threshold      <- residual pass threshold` },
        { t: 'h3', x: 'Running it under Slurm with Pyxis' },
        { t: 'code', lang: 'bash', title: 'Single-node HPL (8 GPUs) via srun + Pyxis/Enroot', x: `srun -N 1 --ntasks-per-node=8 --gpus-per-node=8 --cpus-per-task=16 \\
     --mpi=pmix \\
     --container-image=nvcr.io#nvidia/hpc-benchmarks:<tag> \\
     --container-mounts=$PWD/dat:/my-dat \\
     ./hpl.sh --dat /my-dat/HPL-8GPU.dat

# Same thing, one job per node, across many nodes at once (burn-in sweep):
sbatch -N 32 --array=... hpl-single.sbatch      # or a loop of srun -w <node>` },
        { t: 'p', x: 'The `--container-image` flag comes from [[pyxis|Pyxis]], which imports the image through [[enroot|Enroot]]; `--mpi=pmix` lets Slurm wire up the MPI ranks without a separate `mpirun`. The same container can be run with `mpirun -np 8` outside Slurm.' },

        { t: 'h3', x: 'Reading the output' },
        { t: 'code', lang: 'text', title: 'Tail of an HPL run', x: `T/V                N    NB     P     Q         Time          Gflops
--------------------------------------------------------------------------------
WR01C2R8      250368   576     2     4       xxx.xx       3.9xxe+05
--------------------------------------------------------------------------------
||Ax-b||_oo/(eps*(||A||_oo*||x||_oo+||b||_oo)*N)=   0.0021... ...... PASSED` },
        { t: 'ul', items: [
          '**Gflops** — compare with the theoretical FP64 peak (Rpeak = GPUs × per-GPU FP64 Tensor Core peak) to get efficiency, and — more importantly — with **the same test on identical nodes**. A node a few percent below its peers is a suspect.',
          '**Residual PASSED / FAILED** — see [[hpl-residual|HPL residual]]. FAILED means wrong answers: bad HBM, a faulty GPU or data corruption. It invalidates the GFLOPS figure entirely.',
          '**Time** — for burn-in you want it to be consistent run after run.',
        ]},
        { t: 'callout', kind: 'trap', title: 'Classic HPL mistakes', x: [
          'P × Q ≠ number of ranks → the run errors out or leaves GPUs idle.',
          'N far too small → the run finishes quickly with poor GFLOPS; the GPUs never reach steady state. N too large → CUDA out-of-memory.',
          'Judging HPL by GFLOPS alone. A fast run with **FAILED** is a failed node.',
        ]},

        { t: 'h2', x: 'HPL burn-in (objective 4.12)' },
        { t: 'p', x: '[[burn-in|Burn-in]] is about **duration and consistency**, not peak performance. Run HPL repeatedly (or with a long run time) on every node for hours — commonly overnight — while DCGM/nvidia-smi collect temperatures, clocks and errors.' },
        { t: 'vs', cards: [
          { h: 'A node passes burn-in when…', items: [
            'Every iteration reports PASSED',
            'GFLOPS stays within a small band (a few %) run to run and versus peers',
            'No new Xid, ECC, PCIe or NVLink errors appear',
            'No HW thermal / power-brake slowdown events',
          ]},
          { h: 'Pull the node when…', items: [
            'Any FAILED residual, crash or hang',
            'Performance decays over time (thermal soak) or is an outlier',
            'A GPU drops off the bus or ECC errors accumulate',
            'BMC/SEL logs PSU or fan events during the run',
          ]},
        ]},
        { t: 'callout', kind: 'tip', title: 'Scale the burn-in', x: 'Run single-node HPL on every node in parallel (one Slurm job per node), collect the GFLOPS into a table, and sort. The outliers at the bottom are your repair list. Then run multi-node HPL across the full pool — P × Q = total GPUs — to stress the fabric as well.' },
        { t: 'p', x: 'References: [DCGM user guide](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/index.html) · [DGX SuperPOD validation](https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/validation.html).' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'nccl',
      title: 'NCCL: NVLink Switch, E/W fabric bandwidth and burn-in',
      minutes: 16,
      blocks: [
        { t: 'lede', x: '[[nccl|NCCL]] is the collective library every distributed training job depends on, so NCCL bandwidth is the acceptance metric for both the in-node NVLink/NVSwitch domain and the east-west compute fabric. Objectives 4.3 (NVLink Switch), 4.10 (E/W fabric bandwidth) and 4.11 (NCCL burn-in).' },

        { t: 'h2', x: 'Building nccl-tests' },
        { t: 'code', lang: 'bash', title: 'Build once, share over NFS or bake into a container', x: `git clone https://github.com/NVIDIA/nccl-tests.git
cd nccl-tests
make MPI=1 MPI_HOME=/usr/mpi/gcc/openmpi-<ver> CUDA_HOME=/usr/local/cuda NCCL_HOME=/usr
ls build/          # all_reduce_perf all_gather_perf reduce_scatter_perf alltoall_perf ...` },
        { t: 'p', x: 'Without `MPI=1` the binaries can only drive GPUs inside one process (single node, `-g 8`). Many sites instead run the prebuilt tests inside an NGC container (e.g. a PyTorch or HPC container) through Pyxis.' },

        { t: 'h2', x: 'The flags you must recognise' },
        { t: 'table', head: ['Flag', 'Meaning', 'Typical'], rows: [
          ['`-b`', 'Minimum message size', '`8` (bytes)'],
          ['`-e`', 'Maximum message size', '`8G`–`16G`'],
          ['`-f`', 'Multiply size by this factor each step', '`2`'],
          ['`-g`', 'GPUs per process (thread)', '`8` single-process single-node; `1` when launching one rank per GPU'],
          ['`-n` / `-w`', 'Iterations / warm-up iterations', 'Increase for burn-in'],
          ['`-c`', 'Check results for correctness', '`1` for validation runs'],
          ['`-d`', 'Data type', 'default float'],
        ]},

        { t: 'h2', x: 'Single node: validating NVLink and NVSwitch (4.3)' },
        { t: 'code', lang: 'bash', title: 'Single-node all-reduce across 8 GPUs', x: `./build/all_reduce_perf -b 8 -e 16G -f 2 -g 8

#       size    count  type  redop    time  algbw  busbw  #wrong
#        (B)                          (us) (GB/s) (GB/s)
  ...
  8589934592 2147483648 float sum  xxxxx  2xx.x  4xx.x    0
 17179869184 4294967296 float sum  xxxxx  2xx.x  4xx.x    0
# Avg bus bandwidth    : ...` },
        { t: 'p', x: 'Read **[[busbw|busbw]]** in the large-message rows (hundreds of MB to GB). algbw is simply bytes ÷ time; busbw applies the collective\'s correction factor (2(n−1)/n for all-reduce) so it can be compared with link speed regardless of GPU count. `#wrong` must be 0.' },
        { t: 'specs', rows: [
          ['HGX/DGX H100 (NVLink 4, 900 GB/s bidirectional per GPU)', 'Single-node all_reduce busbw at large sizes is expected around ~450 GB/s or more; with [[nvls|NVLink SHARP]] it can be higher. Treat NVIDIA\'s published/reference figures for your exact system as the target.'],
          ['Small messages', 'Latency-bound — low GB/s is normal and not a fault.'],
          ['Mid-size plateau', 'Should rise smoothly to a plateau; a sudden cliff or a much lower plateau than peers is a finding.'],
        ]},
        { t: 'h3', x: 'When single-node NCCL is low' },
        { t: 'ul', items: [
          '[[fabric-manager|Fabric Manager]] not running or failed → on NVSwitch systems GPUs cannot set up NVLink peer mappings; CUDA/NCCL fails or falls back. Check `systemctl status nvidia-fabricmanager` and `nvidia-smi -q` Fabric state.',
          'An NVLink down or degraded → `nvidia-smi nvlink -s` (per-link speed), `nvidia-smi nvlink -e` (error counters), `nvidia-smi topo -m` should show NV18 between every pair on H100.',
          'Driver / Fabric Manager version mismatch → FM refuses to start; they must be the same version.',
          'ACS/IOMMU settings forcing PCIe P2P through the root complex (relevant for PCIe paths and GPUDirect RDMA).',
        ]},
        { t: 'callout', kind: 'exam', title: 'NVLink Switch systems (NVL72 and similar)', x: 'On rack-scale NVLink systems (e.g. GB200 NVL72) the NVLink domain spans many trays through external NVLink Switch trays. The principle is identical: run NCCL across all GPUs of the NVLink domain and compare busbw with the reference; confirm every compute tray has joined the fabric (Fabric State completed, correct clique/cluster IDs in `nvidia-smi -q`) before blaming the switches.' },

        { t: 'h2', x: 'Multi-node: validating the E/W fabric (4.10)' },
        { t: 'p', x: 'Across nodes you launch **one rank per GPU** (`-g 1`) with MPI or Slurm. NCCL keeps traffic on NVLink inside a node and sends inter-node traffic over the [[connectx|ConnectX]] NICs on the [[rail-optimized|rail-optimised]] [[east-west|east-west]] fabric using [[rdma|RDMA]] and GPUDirect RDMA.' },
        { t: 'code', lang: 'bash', title: 'Two ways to launch 2 nodes × 8 GPUs', x: `# Slurm + Pyxis (common on BCM clusters)
srun -N 2 --ntasks-per-node=8 --gpus-per-node=8 --mpi=pmix \\
     --container-image=<image with nccl-tests> \\
     all_reduce_perf -b 8 -e 16G -f 2 -g 1

# Open MPI directly
mpirun -np 16 -N 8 --hostfile hosts \\
       -x NCCL_DEBUG=INFO -x NCCL_IB_HCA=mlx5_0,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_9,mlx5_10,mlx5_11 \\
       ./build/all_reduce_perf -b 8 -e 16G -f 2 -g 1` },
        { t: 'callout', kind: 'warn', title: 'HCA names are system-specific', x: 'The mlx5 device list above is illustrative. Compute-fabric HCAs, storage/in-band NICs and BlueField ports all appear as mlx5_N. Use `ibdev2netdev`, `ibstat` and the system\'s documentation to pick only the compute-rail devices for NCCL_IB_HCA.' },
        { t: 'h3', x: 'What bandwidth to expect' },
        { t: 'table', head: ['Link', 'Line rate', 'Rough ceiling per rail'], rows: [
          ['InfiniBand NDR / 400GbE', '400 Gb/s', '≈ 50 GB/s per NIC (slightly less after protocol overhead)'],
          ['InfiniBand HDR / 200GbE', '200 Gb/s', '≈ 25 GB/s per NIC'],
          ['8 rails per node (8 × NDR)', '3.2 Tb/s', '≈ 400 GB/s aggregate per node'],
        ]},
        { t: 'p', x: 'Multi-node all-reduce busbw is bounded by each node\'s aggregate E/W bandwidth, so an 8 × NDR node should land at a healthy fraction of ~400 GB/s at large sizes, and point-to-point tests ([[perftest|ib_write_bw]]) on a single rail should approach ~50 GB/s. The exact acceptance number comes from NVIDIA\'s reference results for the system — the exam cares that you compare against **line rate and peers**, not that you memorise a decimal.' },
        { t: 'h3', x: 'NCCL_DEBUG=INFO — proving the right path' },
        { t: 'code', lang: 'text', title: 'Lines worth grepping for', x: `NCCL INFO NET/IB : Using [0]mlx5_0:1/IB [1]mlx5_3:1/IB ... [7]mlx5_11:1/IB   <- good: all 8 rails
NCCL INFO Channel 00/32 : 0[0] -> 1[1] via P2P/IPC                          <- NVLink inside node
NCCL INFO Channel 00/0 : 7[7] -> 8[0] [send] via NET/IB/0/GDRDMA             <- GPUDirect RDMA
NCCL INFO NVLS multicast support is available                                 <- NVLink SHARP

NCCL INFO NET/Socket : Using [0]eth0                                          <- BAD: TCP fallback` },
        { t: 'table', head: ['Variable', 'Use in validation'], rows: [
          ['`NCCL_DEBUG=INFO` (+ `NCCL_DEBUG_SUBSYS=INIT,NET`)', 'Show chosen transports, NICs, rings/trees, GDR use'],
          ['`NCCL_IB_HCA`', 'Restrict to compute-fabric HCAs; test one rail at a time (`=mlx5_0`)'],
          ['`NCCL_SOCKET_IFNAME`', 'Interface for bootstrap/OOB TCP connections'],
          ['`NCCL_TOPO_FILE` / `NCCL_TOPO_DUMP_FILE`', 'Provide or dump the topology NCCL detects (useful in VMs or odd PCIe layouts)'],
          ['`NCCL_IB_DISABLE=1`, `NCCL_P2P_DISABLE=1`', 'Debug only: force transports to isolate a layer — never leave set'],
        ]},
        { t: 'callout', kind: 'trap', title: 'Low multi-node bandwidth — usual causes', x: [
          'NCCL fell back to **NET/Socket** (IB modules not loaded, wrong NCCL_IB_HCA, no RDMA device in the container).',
          'Only some rails used → one HCA down, or a rail cabled to the wrong leaf ([[rail-optimized|rail swap]]).',
          'GPUDirect RDMA not active (no `nvidia-peermem` / DMA-BUF support) → traffic bounces through host memory.',
          'A single slow link: one node\'s NIC trained at HDR or 1X, or accumulating symbol errors — see the cable-validation lesson.',
          '[[subnet-manager|Subnet manager]] routing or adaptive-routing configuration not as designed.',
        ]},
        { t: 'h3', x: 'Bisecting a slow multi-node result' },
        { t: 'flow', steps: [
          { b: 'Single node each', s: 'All nodes pass single-node NCCL? If not, fix NVLink/FM first.' },
          { b: 'Pairs', s: 'Run 2-node tests over node pairs; the slow pairs share a common node or switch.' },
          { b: 'Per rail', s: '`NCCL_IB_HCA=mlx5_X` or `ib_write_bw` per rail isolates the NIC/cable.' },
          { b: 'Physical layer', s: '`mlxlink`, `ibdiagnet`, port counters on that link.' },
        ]},

        { t: 'h2', x: 'NCCL burn-in (4.11)' },
        { t: 'p', x: 'A burn-in runs NCCL for hours across the full pool (and across rotating subsets), usually all_reduce plus all_to_all, with many iterations. The questions it answers: does bandwidth stay flat, do links flap, do counters climb, does any rank hang?' },
        { t: 'code', lang: 'bash', title: 'A simple burn-in loop', x: `for i in $(seq 1 200); do
  srun -N 32 --ntasks-per-node=8 --gpus-per-node=8 --mpi=pmix \\
       --container-image=<image> all_reduce_perf -b 1G -e 16G -f 2 -g 1 -n 200 -c 1 \\
       | grep -E "Avg bus bandwidth|#wrong" | sed "s/^/iter $i /" >> nccl-burnin.log
done
# afterwards: plot busbw per iteration; check ibdiagnet counters and dmesg on every node` },
        { t: 'vs', cards: [
          { h: 'Healthy burn-in', items: ['busbw varies only slightly between iterations', 'No #wrong, no timeouts or hangs', 'No new symbol errors / link-downed events', 'No Xid 74 (NVLink) or 79'] },
          { h: 'Investigate', items: ['Periodic dips → congestion, a flapping link, thermal throttling', 'Gradual decline → heat soak, failing optics', 'A hang → a rank lost its link or GPU', 'Bandwidth fine but counters rising → marginal cable that will fail later'] },
        ]},
        { t: 'callout', kind: 'exam', title: 'Variance is the signal', x: 'In burn-in questions, a run whose **average** is acceptable but whose iterations vary widely is still a finding. Consistency over time and across nodes is what burn-in proves.' },
        { t: 'p', x: 'References: [NCCL user guide](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/overview.html) · [DGX SuperPOD validation](https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/validation.html).' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'cable-validation',
      title: 'Validating cabling and signal quality',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'A large AI cluster has thousands of cables and optics. Two separate questions must be answered for every link: **is it plugged into the right place** (objective 4.5), and **is the signal clean** (objective 4.4)? A link that is merely "up" passes neither test by itself.' },

        { t: 'h2', x: 'The toolset' },
        { t: 'table', head: ['Tool', 'Scope', 'Answers'], rows: [
          ['`ibstat` / `ibstatus`', 'Local HCA ports', 'State Active, Physical state LinkUp, Rate 400 (NDR)'],
          ['[[iblinkinfo|iblinkinfo]]', 'Whole fabric, per switch port', 'Neighbour, width (4X/1X) and speed of every link'],
          ['[[ibnetdiscover|ibnetdiscover]]', 'Whole fabric', 'As-built topology to diff against the design'],
          ['[[ibdiagnet|ibdiagnet]]', 'Whole fabric', 'Links, counters, speed/width mismatches, cable/PHY info, FW, routing'],
          ['`perfquery`', 'One port', '[[ib-port-counters|PMA counters]] (symbol errors, link downed…)'],
          ['[[mlxlink|mlxlink]]', 'One port (local or in-band on a switch)', 'Raw/effective [[ber|BER]], [[fec|FEC]], eye opening, module info'],
          ['[[ufm|UFM]] + [[cable-validation-tool|Cable Validation Tool]]', 'Whole fabric, continuous', 'Topology vs. plan, alarms on counters, cable inventory'],
          ['[[lldp|LLDP]] (`lldpctl`, `nv show … lldp`)', 'Ethernet links', 'Neighbour name/port for RoCE, storage and management networks'],
        ]},

        { t: 'h2', x: 'Is the link up at the right width and speed?' },
        { t: 'code', lang: 'bash', title: 'Host view and fabric view', x: `ibstat mlx5_0
#   State: Active    Physical state: LinkUp    Rate: 400    Link layer: InfiniBand

iblinkinfo | less
#   ... 4X 106.25 Gbps Active/  LinkUp ...  ==> NDR, healthy
#   ... 1X 106.25 Gbps Active/  LinkUp ...  ==> DEGRADED width (lost lanes)
#   ... 4X  53.125 Gbps Active/ LinkUp ...  ==> trained at HDR on an NDR link
#   ... Polling / Down                      ==> no link: cable, optic, far end` },
        { t: 'callout', kind: 'trap', title: '"Active" is not "healthy"', x: 'A link at 1X or at HDR on an NDR fabric is Active and passes traffic — ping and even NCCL work, just slowly. Degraded width or speed is a physical-layer fault (damaged cable, dirty connector, bad optic, mismatched cable type) to be fixed, not tuned away.' },

        { t: 'h2', x: 'Is the signal clean? Counters and BER' },
        { t: 'h3', x: 'Port counters' },
        { t: 'table', head: ['Counter', 'Meaning', 'Healthy link'], rows: [
          ['SymbolErrorCounter', 'Minor link errors detected on the physical lanes', '0 or not increasing'],
          ['LinkErrorRecoveryCounter', 'Link retrained to recover from errors', '0'],
          ['LinkDownedCounter', 'Link went down (flap)', '0 after bring-up'],
          ['PortRcvErrors', 'Bad packets received (CRC etc.)', '0'],
          ['PortRcvRemotePhysicalErrors', 'Errors originating upstream', '0'],
          ['PortXmitDiscards', 'Packets dropped on transmit', '≈ 0; non-zero hints at routing/timeouts'],
          ['PortXmitWait', 'Time waiting to transmit', 'Congestion indicator, **not** a cable error'],
        ]},
        { t: 'code', lang: 'bash', title: 'Clear, load, re-check — the standard pattern', x: `# 1. clear counters fabric-wide and take a baseline
ibdiagnet --pc

# 2. run traffic (NCCL / ib_write_bw / burn-in) for a meaningful time

# 3. rerun and report every counter that moved; add PHY and cable info
ibdiagnet -P all=1 --get_phy_info --get_cable_info
less /var/tmp/ibdiagnet2/ibdiagnet2.log      # summary, errors and warnings
ls   /var/tmp/ibdiagnet2/                    # .pm (counters), .db_csv, .net_dump, cables ...` },
        { t: 'h3', x: 'BER, FEC and the eye with mlxlink' },
        { t: 'code', lang: 'bash', title: 'mlxlink on a host port or, in-band, on a switch port', x: `mlxlink -d mlx5_0                 # state, speed, width, FEC mode
mlxlink -d mlx5_0 -c              # counters incl. Raw / Effective Physical BER, errors
mlxlink -d mlx5_0 -e              # eye opening per lane
mlxlink -d mlx5_0 -m              # module (transceiver/cable) info: vendor, PN, SN, FW, temps, Rx/Tx power
mlxlink -d mlx5_0 --rx_fec_histogram --show_histogram   # FEC-corrected symbols distribution
mlxlink -d lid-0x1a -p 17 -c      # switch port 17 reached in-band by LID` },
        { t: 'ul', items: [
          '**Raw (pre-FEC) BER** — non-zero is normal on PAM4 links (HDR/NDR, 200/400G Ethernet). It should be comfortably within what [[fec|FEC]] can correct; a raw BER that is orders of magnitude worse than on neighbouring links marks a marginal cable or optic.',
          '**Effective (post-FEC) BER** — should be essentially zero (vanishingly small, e.g. far below 1e-12); any uncorrectable errors or climbing symbol errors = fail.',
          '**Eye opening** — a small or asymmetric eye on one lane points at that lane: contamination, a bent fibre or a bad connector.',
          '**Module info** — optical Rx power low on one lane often means a dirty connector: clean and reseat before replacing.',
        ]},
        { t: 'callout', kind: 'exam', title: 'The remediation order', x: 'For a link with errors or degraded width: **reseat → clean the connectors (optics) → swap the cable/transceiver → move to a different port** to decide whether the cable or the port is at fault. Re-run the counter test after every step.' },

        { t: 'h2', x: 'Is every cable in the right place? (4.5)' },
        { t: 'p', x: 'A cluster can have perfect signal quality and still be miswired — for example, two GPU rails swapped between leaf switches. Everything is up, but NCCL traffic that should stay on one leaf now crosses spines, and [[rail-optimized|rail-optimised]] performance collapses under load.' },
        { t: 'flow', steps: [
          { b: 'Design', s: 'The planned topology (cabling plan / topology file): which node port goes to which switch port, per rail.' },
          { b: 'Discover', s: '[[ibnetdiscover|ibnetdiscover]], [[iblinkinfo|iblinkinfo]] or UFM give the as-built connections by GUID/node description and port.' },
          { b: 'Compare', s: 'The [[cable-validation-tool|Cable Validation Tool]] (or a script diffing the two) flags miswired, missing and unexpected links.' },
          { b: 'Fix + re-verify', s: 'Re-cable, then rerun discovery and signal checks until the as-built equals the design.' },
        ]},
        { t: 'code', lang: 'bash', title: 'Spot checks that catch rail mistakes', x: `# Which switch/port is each local HCA attached to? (node description = switch name)
iblinkinfo | grep -i "$(hostname)"

# Ethernet (RoCE / storage / in-band): who is my neighbour?
lldpctl                                  # host: neighbour switch + port per interface
nv show interface swp1 lldp              # Cumulus/NVUE switch view

# Expected on a rail-optimised DGX pod: every node's HCA for GPU n lands on leaf "rail n".` },
        { t: 'callout', kind: 'tip', title: 'Name things before you validate', x: 'Validation at scale depends on meaningful node descriptions and switch names (set during bring-up). If every host shows up as "MT4129 ConnectX7 Mellanox Technologies", comparing as-built to design becomes a GUID-mapping exercise.' },

        { t: 'h2', x: 'UFM for fabric-wide, ongoing validation' },
        { t: 'p', x: '[[ufm|UFM]] runs the subnet manager, continuously collects counters, raises alarms on thresholds (symbol errors, link down, high BER), keeps an inventory of cables and transceivers (vendor, part number, serial, firmware), and includes the cable-validation workflow for new builds. On a large fabric, the exam answer for "continuously detect degrading links" is UFM, while ibdiagnet is the on-demand CLI equivalent.' },
        { t: 'p', x: 'Reference: [InfiniBand Cluster Bring-up Procedure — Cable Validation](https://docs.nvidia.com/networking/display/infinibandclusterbringupprocedure/cable+validation).' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'fw-sw-confirm',
      title: 'Confirming firmware and software on switches, BlueField-3 and transceivers',
      minutes: 13,
      blocks: [
        { t: 'lede', x: 'Acceptance requires that every device runs the firmware and software versions in the validated recipe (the DGX/SuperPOD release notes or your own golden baseline). Mixed firmware causes link training failures, odd performance and support headaches. Objectives 4.6 (switches), 4.7 (BlueField-3) and 4.8 (transceivers).' },

        { t: 'h2', x: 'The principle: compare against a baseline' },
        { t: 'flow', steps: [
          { b: 'Baseline', s: 'The versions from the release notes / validated stack for your platform.' },
          { b: 'Inventory', s: 'Query every switch, NIC, DPU and transceiver — ideally programmatically.' },
          { b: 'Diff', s: 'Anything not matching the baseline, or differing between identical devices, is a finding.' },
          { b: 'Remediate', s: 'Update, reset/reboot to activate, and re-query to confirm the running version.' },
        ]},
        { t: 'callout', kind: 'trap', title: 'Installed ≠ running', x: 'Burning new firmware to flash does not activate it. NIC/DPU firmware needs a reset (`mlxfwreset`) or reboot/power cycle; switch firmware needs a switch reboot. Queries often show both the running and the pending ("next boot") version — confirm the **running** one matches.' },

        { t: 'h2', x: 'Switches (4.6)' },
        { t: 'table', head: ['Switch type', 'How to confirm', 'Notes'], rows: [
          ['Managed Quantum IB (NVOS)', '`nv show system` / `nv show platform firmware`', 'NVOS image and switch ASIC firmware'],
          ['Spectrum Ethernet (Cumulus Linux)', '`nv show system`, `nv show platform`', 'NVUE CLI; also Linux commands on the switch'],
          ['Older MLNX-OS / Onyx', '`show version`, `show asic-version`', 'Legacy CLI'],
          ['Unmanaged / externally managed IB', 'From a host: `flint -d lid-<LID> q` or `mlxfwmanager -d lid-<LID> --query`', 'No switch OS — firmware only, queried in-band'],
          ['Every switch at once', '[[ibdiagnet|ibdiagnet]] (reports FW versions and flags mismatches) or [[ufm|UFM]] inventory', 'Best for large fabrics'],
        ]},
        { t: 'code', lang: 'bash', title: 'Examples', x: `# NVOS / Cumulus (NVUE)
nv show system                        # hostname, product, OS build/version
nv show platform firmware             # component firmware versions

# Onyx / MLNX-OS
show version

# Unmanaged Quantum switch, in-band from a host on the fabric
ibswitches                            # list switches with their LIDs
flint -d lid-0x1a q                   # FW Version, PSID
mlxfwmanager -d lid-0x1a --query` },
        { t: 'callout', kind: 'exam', title: 'Managed vs. unmanaged', x: 'If the question says the switch is unmanaged (externally managed, see [[switch-os|switch OS]]), there is no CLI to log into — the answer uses in-band MFT tools (`flint`/`mlxfwmanager` with `lid-`) or a fabric-wide tool (ibdiagnet, UFM).' },

        { t: 'h2', x: 'BlueField-3 (4.7)' },
        { t: 'p', x: 'A [[bluefield|BlueField-3]] has several layers of software to confirm: the **NIC firmware** (the ConnectX-class datapath), the **boot software** (ATF/UEFI), the **BFB bundle** with its Arm OS and [[doca|DOCA]] runtime, and the DPU **BMC** firmware.' },
        { t: 'table', head: ['Layer', 'Where to run', 'Command'], rows: [
          ['NIC firmware', 'Host or DPU', '`mlxfwmanager --query`, `flint -d /dev/mst/mt41692_pciconf0 q`'],
          ['Boot software / BFB release', 'DPU Arm OS', '[[bfver|bfver]] (ATF, UEFI, BSP versions)'],
          ['OS and DOCA packages', 'DPU Arm OS', '`cat /etc/mlnx-release`, `dpkg -l | grep -i doca`, `ofed_info -s`'],
          ['Operating mode', 'Host or DPU', '`mlxconfig -d <dev> q` (e.g. INTERNAL_CPU_MODEL: DPU vs. NIC mode)'],
          ['DPU BMC', 'OOB network', 'Redfish / BMC web UI firmware inventory'],
        ]},
        { t: 'code', lang: 'bash', title: 'Typical BlueField-3 check', x: `# On the host
sudo mst start
sudo mlxfwmanager --query
#   Device Type:   BlueField3
#   PSID:          MT_xxxxxxxxxx
#   Versions:      Current        Available
#     FW           32.xx.xxxx     N/A

# On the DPU (ssh via rshim/tmfifo or OOB)
sudo bfver
dpkg -l | grep -i doca | head` },
        { t: 'callout', kind: 'tip', title: 'Recognise the family by FW major number', x: 'NVIDIA NIC firmware major versions identify the device family — for example ConnectX-7 firmware is 28.x and BlueField-3 is 32.x. A query that shows a BlueField-3 on an unexpected major/minor line is worth checking against the release notes.' },

        { t: 'h2', x: 'Transceivers and cables (4.8)' },
        { t: 'p', x: 'Modern [[linkx|LinkX]] optics (e.g. 800G twin-port OSFP for NDR switches, 400G OSFP on ConnectX-7) run their own firmware. Mismatched transceiver firmware can cause link-training problems and is part of the validated recipe.' },
        { t: 'code', lang: 'bash', title: 'Querying transceivers', x: `mlxlink -d mlx5_0 -m                 # vendor, part number, serial, FW version, temperature, power
mlxlink -d lid-0x1a -p 17 -m         # same for a switch port, in-band
ibdiagnet --get_cable_info           # every cable/module in the fabric -> ibdiagnet2 cable report
# NVOS switch: nv show interface <port> transceiver` },
        { t: 'ul', items: [
          'Fabric-wide: [[ufm|UFM]] cable/transceiver inventory lists vendor, PN, serial and firmware for every module, which is the practical way to find stragglers on thousands of optics.',
          'Transceiver firmware is updated with MFT (flint / mlxfwmanager LinkX options) or through the switch OS/UFM — always per the release notes and with the link down.',
          'Check that modules are NVIDIA-qualified parts; unsupported third-party optics are a common cause of flaky links.',
        ]},

        { t: 'h2', x: 'Host software to confirm while you are there' },
        { t: 'specs', rows: [
          ['GPU driver / CUDA', '`nvidia-smi` header; must match the recipe on every node'],
          ['Fabric Manager', '`nv-fabricmanager --version` — same version as the driver'],
          ['DOCA-OFED / MOFED', '`ofed_info -s`'],
          ['NIC firmware', '`mlxfwmanager --query` — all compute HCAs identical'],
          ['GPU / system firmware', '`nvidia-smi -q | grep -i vbios`, BMC/Redfish inventory, `nvfwupd show_version` on HGX'],
          ['Cluster-wide', 'BCM / `pdsh` loops that collect the above and diff against the baseline'],
        ]},
        { t: 'callout', kind: 'exam', title: 'One-liner summary', x: '**Switch** → OS CLI (`nv show`, `show version`) or in-band `flint -d lid-…`. **BlueField-3** → `mlxfwmanager --query` / `flint q` for firmware, `bfver` + DOCA packages for software. **Transceivers** → `mlxlink -m`, ibdiagnet cable info, UFM inventory.' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'clusterkit-nemo-storage',
      title: 'ClusterKit, NeMo burn-in and storage testing',
      minutes: 15,
      blocks: [
        { t: 'lede', x: 'The final layer of acceptance: a multifaceted assessment that finds outlier nodes and links across the whole pool ([[clusterkit|ClusterKit]], 4.9), a realistic end-to-end training burn-in ([[nemo-framework|NeMo]], 4.13), and proof that storage can feed the GPUs (4.14).' },

        { t: 'h2', x: 'ClusterKit (4.9)' },
        { t: 'p', x: 'ClusterKit ships with [[hpc-x|HPC-X]]. Given a host list, it runs a battery of tests — node-to-node bandwidth and latency (often pairwise across the pool), collective tests, GPU and host-memory bandwidth, GPU-to-GPU and GPUDirect RDMA checks — and summarises the results so outliers stand out (e.g. as matrices or heatmaps of pairwise bandwidth).' },
        { t: 'code', lang: 'bash', title: 'Illustrative ClusterKit run (flags vary by HPC-X release)', x: `module load hpcx                           # or source hpcx-init.sh && hpcx_load
cat hosts                                  # one hostname per line
$HPCX_CLUSTERKIT_DIR/bin/clusterkit.sh --hostfile hosts   # plus test-selection options as needed
# results: per-test output, pairwise bandwidth/latency matrices and a summary of outliers` },
        { t: 'table', head: ['Test type', 'Finds'], rows: [
          ['Pairwise bandwidth', 'A node or link far below the others (bad NIC, cable, wrong rail)'],
          ['Pairwise latency', 'Extra hops (miswiring), misrouting, congestion'],
          ['GPU / memory bandwidth', 'A node with a weak GPU, a wrong memory population or BIOS setting'],
          ['Collectives', 'Scale-related problems that pair tests miss'],
        ]},
        { t: 'callout', kind: 'exam', title: 'When ClusterKit is the answer', x: '"Assess many nodes at once and identify the outliers" → ClusterKit. For pinpointing one suspected link, use [[perftest|ib_write_bw]] / mlxlink; for GPU hardware, [[dcgmi-diag|dcgmi diag]]; for collective performance, [[nccl-tests|nccl-tests]].' },

        { t: 'h2', x: 'NeMo burn-in (4.13)' },
        { t: 'p', x: 'Synthetic tests stress one subsystem at a time. A real LLM pretraining run stresses everything together — tensor cores, HBM, NVLink, the E/W fabric, CPU, host memory and storage checkpoints — with the communication pattern users will actually generate. NVIDIA\'s SuperPOD validation uses the [[nemo-framework|NeMo Framework]] container for exactly this.' },
        { t: 'flow', steps: [
          { b: 'Pull', s: '`nvcr.io/nvidia/nemo:<tag>` from [[ngc|NGC]] (import with Enroot or let Pyxis pull it).' },
          { b: 'Pick a recipe', s: 'A standard pretraining config (e.g. a Llama or GPT model size that fits the pool), often with synthetic/mock data so storage is not a variable at first.' },
          { b: 'Launch', s: 'Slurm + Pyxis across N nodes, 8 GPUs each, tensor/pipeline/data parallel sizes from the recipe.' },
          { b: 'Run long', s: 'Hours, with periodic checkpoints to exercise storage writes.' },
          { b: 'Judge', s: 'Stable step time, TFLOPS/GPU near reference, loss falling and finite, no hangs or Xids.' },
        ]},
        { t: 'code', lang: 'bash', title: 'Shape of a NeMo burn-in job', x: `srun -N 16 --ntasks-per-node=8 --gpus-per-node=8 --mpi=pmix \\
     --container-image=nvcr.io#nvidia/nemo:<tag> \\
     --container-mounts=/lustre/results:/results \\
     python <pretraining script / recipe> \\
       trainer.num_nodes=16 trainer.devices=8 trainer.max_steps=<many> \\
       model.tensor_model_parallel_size=<tp> model.pipeline_model_parallel_size=<pp> \\
       model.data=<mock or real>

# watch: train_step_timing, TFLOPS/GPU (or tokens/s), reduced_train_loss` },
        { t: 'table', head: ['Observation', 'Meaning'], rows: [
          ['Step time flat, loss decreasing', 'Healthy'],
          ['Step time spikes periodically', 'Checkpoint writes to slow storage, a flapping link, or a throttling GPU'],
          ['Step time uniformly slower than reference', 'A straggler node or slow rail — synchronous training runs at the pace of the slowest rank'],
          ['Loss is NaN or diverges on a known-good recipe', 'Suspect silent data corruption on a GPU; run dcgmi diag -r 3/4 across the pool'],
          ['Job hangs in a collective (NCCL timeout)', 'A rank lost its GPU or link; check dmesg Xids and fabric counters'],
        ]},
        { t: 'callout', kind: 'trap', title: 'Stragglers hide in averages', x: 'Because data-parallel training synchronises every step, one slow node slows **every** node. The fix is not tuning NeMo — it is finding the node (per-rank timing, NCCL pair tests, ClusterKit) and removing it.' },

        { t: 'h2', x: 'Storage testing (4.14)' },
        { t: 'p', x: 'Storage is tested at two scopes: **per node** (can one DGX pull data fast enough?) and **aggregate** (does the [[parallel-fs|parallel file system]] scale when every node reads at once?). Measure bandwidth, IOPS and metadata operations, and compare against the storage vendor\'s and NVIDIA\'s guidance for the cluster size.' },
        { t: 'h3', x: 'fio — file-system throughput' },
        { t: 'code', lang: 'bash', title: 'Sequential read throughput from one node', x: `fio --name=seqread --directory=/mnt/pfs/fio --rw=read --bs=1M \\
    --direct=1 --ioengine=libaio --iodepth=32 --numjobs=16 \\
    --size=32G --runtime=120 --time_based --group_reporting

# write test: --rw=write ; random small I/O: --rw=randread --bs=4k ; mixed: --rw=randrw --rwmixread=70` },
        { t: 'table', head: ['fio option', 'Why it matters'], rows: [
          ['`--direct=1`', 'Bypass the page cache — otherwise you measure RAM, not storage'],
          ['`--bs=1M` (throughput) / `4k` (IOPS)', 'Large blocks for bandwidth, small for IOPS/latency'],
          ['`--iodepth`, `--numjobs`', 'Enough outstanding I/O to saturate the path; one job rarely fills a 400G NIC'],
          ['`--size`', 'Data set larger than any cache in the path'],
          ['`--group_reporting`', 'One aggregate result per job group'],
        ]},
        { t: 'p', x: 'For the aggregate test, run fio (or IOR, its MPI-based HPC equivalent) on many nodes simultaneously and sum the results; use **mdtest** for metadata (file create/stat/delete rates), which matters for datasets with millions of small files.' },

        { t: 'h3', x: 'GPUDirect Storage' },
        { t: 'code', lang: 'bash', title: 'GDS readiness and throughput', x: `/usr/local/cuda/gds/tools/gdscheck -p       # GDS driver, nvidia-fs, supported file systems
/usr/local/cuda/gds/tools/gdsio -D /mnt/pfs/gds -d 0 -w 8 -s 8G -i 1M -x 0 -I 0 -T 60
#   -d GPU index  -w worker threads  -s file size  -i I/O size
#   -x 0 = GPU Direct path, -x 1 = CPU only (compare!)   -I 0 = read, 1 = write` },
        { t: 'p', x: '[[gdsio|gdsio]] measures the storage-to-GPU-memory path of [[gds|GDS]]. Comparing `-x 0` (GPUDirect) with `-x 1` (through CPU memory) shows whether GDS is actually delivering a benefit. Run [[gdsio|gdscheck]] first — if the file system or nvidia-fs is not supported, GDS falls back to compatibility mode.' },

        { t: 'h3', x: 'DGX local NVMe: /raid' },
        { t: 'code', lang: 'bash', title: 'Check the local cache array', x: `cat /proc/mdstat                 # md RAID 0 over the data NVMe drives, all members present
df -h /raid
systemctl status cachefilesd     # FS-Cache for NFS mounts using the "fsc" option
fio --name=raidread --directory=/raid/fio --rw=read --bs=1M --direct=1 \\
    --ioengine=libaio --iodepth=32 --numjobs=8 --size=16G --group_reporting` },
        { t: 'callout', kind: 'warn', title: '/raid is RAID 0', x: 'The [[dgx-raid-cache|/raid]] array is striped for speed with no redundancy — it is scratch and cache, never the home of the only copy of a dataset. A missing member drive shows up as an array that will not assemble or much lower local throughput.' },

        { t: 'h3', x: 'Interpreting storage results' },
        { t: 'vs', cards: [
          { h: 'Good signs', items: ['Per-node read approaches what its storage NICs can carry', 'Aggregate scales roughly linearly until the storage backend limit', 'Results repeatable run to run', 'GDS (-x 0) at least matches and usually beats CPU path'] },
          { h: 'Red flags', items: ['Per-node result capped near one NIC\'s speed → multipath/bonding not working', 'Aggregate flat as nodes are added → backend or network bottleneck', 'Suspiciously high numbers → page cache (direct=0) or file smaller than cache', 'High metadata latency → MDS/metadata configuration'] },
        ]},
        { t: 'callout', kind: 'exam', title: 'Which storage tool?', x: '**fio** → file-system/NVMe throughput and IOPS through the CPU. **gdsio** → GPUDirect Storage throughput to GPU memory. **gdscheck -p** → is GDS configured? **mdtest** → metadata. **IOR** → multi-node parallel I/O.' },
        { t: 'p', x: 'References: [DGX storage best practices](https://docs.nvidia.com/dgx/bp-dgx/storage.html) · [DGX SuperPOD validation](https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/validation.html).' },
      ],
    },
  ],

  /* ==================================================================== */
  quiz: [
    { id: 'v01', domain: 'verification',
      scenario: 'A newly racked DGX H100 must be qualified before it joins the Slurm partition. You want the standard NVIDIA GPU hardware diagnostic that includes targeted stress, targeted power and memory bandwidth tests but finishes in well under an hour.',
      q: 'Which command fits?',
      opts: ['dcgmi diag -r 1', 'nvidia-smi -q -d PERFORMANCE', 'nvsm show health', 'dcgmi diag -r 3'],
      a: 3,
      why: '**dcgmi diag -r 3** (long) adds targeted stress, targeted power, the GEMM diagnostic and memory bandwidth tests and runs in tens of minutes — the usual pre-production validation level.',
      distract: '**-r 1** only checks the software deployment. **nvidia-smi -q -d PERFORMANCE** shows clock event reasons but generates no load. **nvsm show health** is a status snapshot, not a stress diagnostic.' },

    { id: 'v02', domain: 'verification',
      scenario: 'During a one-hour gpu-burn on an air-cooled HGX node, `nvidia-smi -q -d PERFORMANCE` on GPU 5 shows "HW Thermal Slowdown: Active". The other seven GPUs show only "SW Power Cap: Active" and run 150 MHz faster.',
      q: 'What is the most likely conclusion?',
      opts: ['GPU 5 has a cooling problem (airflow, fan or heatsink contact) and must be investigated', 'Normal behaviour: all GPUs throttle under gpu-burn', 'GPU 5 has a lower application-clock setting that should be raised with nvidia-smi -ac', 'The power cap on the other seven GPUs is misconfigured'],
      a: 0,
      why: 'SW Power Cap under heavy load is expected; **HW Thermal Slowdown** on one GPU only means that GPU cannot shed its heat — a physical cooling issue (fan, blocked airflow, poor thermal interface).',
      distract: 'Throttling due to the power cap is normal, but thermal slowdown on a single GPU is not. Raising clocks would make it worse. The other GPUs are behaving correctly.' },

    { id: 'v03', domain: 'verification',
      scenario: 'You prepare an HPL.dat for a 4-node job with 8 H100 GPUs per node, one MPI rank per GPU.',
      q: 'Which process grid is appropriate?',
      opts: ['P = 8, Q = 8', 'P = 4, Q = 8', 'P = 2, Q = 4', 'P = 1, Q = 4'],
      a: 1,
      why: 'P × Q must equal the number of ranks: 4 nodes × 8 GPUs = 32. A near-square grid with P ≤ Q gives **4 × 8**.',
      distract: '8 × 8 = 64 ranks (too many); 2 × 4 = 8 fits a single node; 1 × 4 = 4 fits neither the rank count nor the near-square guidance.' },

    { id: 'v04', domain: 'verification',
      scenario: 'Single-node HPL on 32 identical nodes: 31 report GFLOPS within 2 % of each other and PASSED. Node dgx-17 reports the highest GFLOPS of all but ends with "……… FAILED".',
      q: 'How should dgx-17 be treated?',
      opts: ['Accept it — the best performer', 'Rerun with a smaller N so it passes', 'Pull it for hardware diagnosis — the results are numerically wrong', 'Lower the residual threshold in HPL.dat'],
      a: 2,
      why: 'A **FAILED** residual means the computed solution is wrong — typically faulty GPU memory or compute. The GFLOPS figure is meaningless; the node needs dcgmi diag -r 4 and likely repair.',
      distract: 'Shrinking N or changing the threshold hides the fault rather than fixing it, and "fastest" is irrelevant when the answer is incorrect.' },

    { id: 'v05', domain: 'verification',
      scenario: 'On a single DGX H100, `all_reduce_perf -b 8 -e 16G -f 2 -g 8` peaks at about 80 GB/s busbw. `systemctl status nvidia-fabricmanager` reports "failed", and `nvidia-smi -q` shows the fabric state is not completed.',
      q: 'What should you do first?',
      opts: ['Set NCCL_P2P_DISABLE=1 and rerun', 'Increase -e to 32G so the plateau is reached', 'Replace the NVSwitch baseboard', 'Fix Fabric Manager (e.g. matching driver/FM versions), start it and rerun the test'],
      a: 3,
      why: 'On NVSwitch systems, [[fabric-manager|Fabric Manager]] must configure the NVSwitch fabric before GPUs can use NVLink. With it failed, NCCL cannot use NVLink properly. A driver/FM version mismatch is the classic cause.',
      distract: 'Disabling P2P forces an even slower path. The message range already reaches the plateau. Hardware replacement is premature while the management service is down.' },

    { id: 'v06', domain: 'verification',
      scenario: 'A 2-node all_reduce_perf run shows low bandwidth. With NCCL_DEBUG=INFO the log contains "NET/Socket : Using [0]ens1f0" and no NET/IB lines.',
      q: 'What does this indicate?',
      opts: ['NCCL is using the InfiniBand fabric with GPUDirect RDMA', 'NCCL fell back to TCP sockets — the IB/RDMA devices are not usable in this environment', 'NVLink SHARP is active and limiting bandwidth', 'The run is correct; NET/Socket is only used for the bootstrap'],
      a: 1,
      why: '**NET/Socket** as the data transport means NCCL found no usable IB/RDMA device (IB modules not loaded, device not passed into the container, wrong NCCL_IB_HCA…) and is sending collectives over TCP.',
      distract: 'Healthy runs show NET/IB with the mlx5 devices (and GDRDMA). NVLS is intra-node. The bootstrap uses sockets separately, but the "NET/Socket : Using" line with no NET/IB means data goes over sockets too.' },

    { id: 'v07', domain: 'verification',
      q: 'In nccl-tests output, why is busbw rather than algbw compared with the hardware link rate?',
      opts: ['busbw corrects for the collective\'s communication pattern (e.g. 2(n−1)/n for all-reduce) so it reflects per-link traffic independent of GPU count', 'busbw excludes small messages from the average', 'algbw includes PCIe overhead that busbw removes', 'busbw is measured by the NIC hardware counters while algbw is estimated'],
      a: 0,
      why: 'algbw is data size ÷ time. **busbw** multiplies by the collective\'s factor so the number approximates the bandwidth actually carried on each link, making it comparable with NVLink or NIC line rate at any rank count.',
      distract: 'Both columns are computed per message size from timing; neither comes from NIC counters, and neither removes PCIe overhead or small-message rows.' },

    { id: 'v08', domain: 'verification',
      scenario: 'Compute nodes have 8 × ConnectX-7 at NDR 400 Gb/s, one per rail. A point-to-point ib_write_bw test on rail 3 between two nodes reports about 24 GB/s; the other rails report about 48 GB/s.',
      q: 'What is the most likely explanation for rail 3?',
      opts: ['Normal — ib_write_bw is limited to half line rate', 'The subnet manager has not been started', 'The rail 3 link on one of the nodes trained at a lower speed or width (e.g. HDR or 2X) or has signal problems', 'NCCL_IB_HCA was not set'],
      a: 2,
      why: 'NDR ≈ 50 GB/s per port, so ~48 GB/s is healthy. Half that on one rail points at a degraded link (HDR speed, reduced width) or errors — check with ibstat/iblinkinfo and mlxlink.',
      distract: 'Without an SM no rail would come up at all. ib_write_bw is not an NCCL tool, so NCCL_IB_HCA is irrelevant, and it is not limited to half line rate.' },

    { id: 'v09', domain: 'verification',
      scenario: 'A 12-hour NCCL burn-in over 64 nodes shows an average busbw within spec, but every 40–50 minutes the bandwidth dips sharply for a few iterations. ibdiagnet afterwards shows LinkDownedCounter = 3 on one leaf-to-node link.',
      q: 'What is the right conclusion?',
      opts: ['Pass — the average is within spec', 'The dips are due to NCCL auto-tuning and can be ignored', 'Increase NCCL iterations so the dips average out', 'Fail that link: it is flapping; reseat/clean/replace the cable or optic and rerun the burn-in'],
      a: 3,
      why: 'Burn-in is about stability. Periodic dips matching **LinkDownedCounter** increments show a flapping link that will disrupt real training jobs. Remediate the physical link and re-test.',
      distract: 'An acceptable average does not excuse instability, and averaging harder only hides the fault. NCCL tuning does not bring links down.' },

    { id: 'v10', domain: 'verification',
      scenario: '`iblinkinfo` on an NDR fabric shows one line as "1X 106.25 Gbps Active/ LinkUp" while all others show "4X 106.25 Gbps Active/ LinkUp".',
      q: 'What does this mean?',
      opts: ['The link is up but running on one lane — a degraded-width physical fault to fix', 'The link is healthy; 1X is an alternative NDR mode', 'The port is an HDR port and should be replaced with an NDR switch', 'The subnet manager is throttling the link due to congestion'],
      a: 0,
      why: 'NDR links run 4 lanes (4X). **1X** at NDR lane speed means three lanes failed to train — a damaged or dirty cable/optic or connector. The link passes traffic at a quarter of the bandwidth.',
      distract: 'Speed (106.25 Gbps per lane) is NDR, so it is not an HDR port. Width is negotiated at link training; the SM does not reduce width for congestion.' },

    { id: 'v11', domain: 'verification',
      q: 'You need to confirm, fabric-wide, that every InfiniBand cable is connected to the switch port specified in the cabling plan before bringing the cluster into service. Which approach matches NVIDIA\'s bring-up procedure?',
      opts: ['Run all_reduce_perf across all nodes and check busbw', 'Compare the as-built topology with the planned topology using the Cable Validation Tool (or an ibnetdiscover-based diff)', 'Run mlxlink -c on every host port', 'Check that ibstat shows State: Active on every HCA'],
      a: 1,
      why: 'Cabling correctness is a comparison of **as-built vs. as-designed** topology. The UFM Cable Validation Tool (or ibnetdiscover/iblinkinfo output diffed against the plan) reports miswired, missing and unexpected links.',
      distract: 'NCCL may still run on a miswired fabric. mlxlink and ibstat check signal and link state, not whether the far end is the right switch port.' },

    { id: 'v12', domain: 'verification',
      scenario: 'mlxlink -c on an NDR host port shows a non-zero Raw Physical BER similar to neighbouring ports, Effective Physical BER of essentially 0, and no effective physical errors.',
      q: 'How do you judge this link?',
      opts: ['Failed — any raw BER above zero requires cable replacement', 'Failed — FEC should be disabled to get an accurate reading', 'Inconclusive until the link is forced to HDR', 'Healthy — raw BER is expected on PAM4 links and FEC corrects it'],
      a: 3,
      why: 'On HDR/NDR PAM4 links, a non-zero **pre-FEC** BER is normal; what matters is that it is in line with peers and that **post-FEC** (effective) BER and uncorrectable errors are zero.',
      distract: 'Disabling FEC or downgrading the link is not a validation step, and non-zero raw BER alone is not a failure criterion.' },

    { id: 'v13', domain: 'verification',
      scenario: 'The fabric uses externally managed (unmanaged) Quantum-2 InfiniBand switches. You must confirm their firmware matches the release notes.',
      q: 'Which method works?',
      opts: ['SSH to each switch and run show version', 'Run nvsm show health on a DGX', 'From a host on the fabric, query each switch in-band, e.g. flint -d lid-<LID> q, or run ibdiagnet / UFM inventory', 'Use bfver on each switch'],
      a: 2,
      why: 'Unmanaged switches have no OS CLI. Their firmware is read **in-band** by LID with MFT tools (flint / mlxfwmanager) or collectively with ibdiagnet or UFM.',
      distract: '`show version` needs a managed switch OS. nvsm reports DGX components. bfver runs on BlueField DPUs, not switches.' },

    { id: 'v14', domain: 'verification',
      scenario: 'You must confirm both the NIC firmware and the BFB/boot software on a BlueField-3 DPU in DPU mode.',
      q: 'Which pair of commands covers both?',
      opts: ['nvidia-smi -q on the host and ibstat on the DPU', 'mlxfwmanager --query (firmware) and bfver on the DPU Arm OS (ATF/UEFI/BSP versions)', 'ibdiagnet --pc and lldpctl', 'dcgmi discovery -l and nvsm show version'],
      a: 1,
      why: '**mlxfwmanager --query** (or flint q) reports the BlueField-3 firmware; **bfver** on the Arm side reports the installed boot software and BSP/BFB release. DOCA package versions complete the picture.',
      distract: 'nvidia-smi and dcgmi are GPU tools; ibstat shows link state; ibdiagnet --pc clears counters and lldpctl shows Ethernet neighbours.' },

    { id: 'v15', domain: 'verification',
      scenario: 'A 16-node NeMo pretraining burn-in on a known-good Llama recipe shows step time 30 % slower than NVIDIA\'s reference for the same configuration, with the loss decreasing normally. Single-node HPL passed on all nodes.',
      q: 'What is the best next step?',
      opts: ['Look for a straggler: run NCCL pair/multi-node tests or ClusterKit to find a slow node or rail', 'Accept the result — loss is decreasing', 'Increase the learning rate to compensate', 'Rebuild the NeMo container with a newer CUDA version'],
      a: 0,
      why: 'Synchronous training runs at the pace of the slowest rank. Single-node HPL does not test the E/W fabric, so the likely culprit is a slow link or node — find it with NCCL pair tests, per-rail tests or **ClusterKit**.',
      distract: 'Loss decreasing shows correctness, not performance. Learning rate does not affect step time. Rebuilding the container with a known-good recipe is guesswork.' },

    { id: 'v16', domain: 'verification',
      scenario: 'A single-node fio sequential read test against the parallel file system reports 60 GB/s — far above what the node\'s two 200 Gb/s storage NICs can carry. The job used --direct=0 and --size=4G.',
      q: 'What is wrong with the test?',
      opts: ['Nothing — the parallel file system is compressing data', 'GPUDirect Storage was accidentally used', 'The --bs is too large', 'The reads were served from the page cache; use --direct=1 and a data set larger than any cache'],
      a: 3,
      why: 'Two 200 Gb/s NICs carry ≈ 50 GB/s at most, so 60 GB/s cannot come from the network. With buffered I/O (**--direct=0**) and a small file, fio is measuring RAM. Use direct I/O and a larger data set.',
      distract: 'fio does not use GDS (that is gdsio). Large block sizes are correct for throughput tests. Compression would not let data exceed wire speed to the client by this much.' },
  ],
}
