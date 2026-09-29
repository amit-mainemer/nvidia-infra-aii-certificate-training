export default {
  id: 'troubleshoot',
  n: 5,
  domain: 'troubleshoot',
  weight: 12,
  title: 'Troubleshoot and Optimize',
  blurb: "Find the faulty GPU, fan, NIC or PSU from evidence rather than guesswork, replace it without breaking the cluster, and tune AMD/Intel servers and storage so healthy hardware actually delivers its rated performance.",
  hours: '3–4 h',
  lessons: [
    /* =====================================================================
       Lesson 1 — Fault identification (5.1, 5.2)
       ===================================================================== */
    {
      id: 'fault-identification',
      title: 'Identifying faulty GPUs, fans, NICs and power supplies',
      minutes: 16,
      blocks: [
        { t: 'lede', x: "Objectives 5.1 and 5.2 ask you to identify faulty hardware and troubleshoot it. Exam stems give you a symptom and one or two pieces of evidence — a dmesg line, an nvidia-smi field, an ibstat output — and ask for the cause or the next step. The skill being tested is reading evidence in the right order, not memorising every error code." },

        { t: 'h2', x: 'A method, not a guess' },
        { t: 'flow', steps: [
          { b: 'Symptom', s: "What did the user or monitor see? Job crash, slow NCCL, node unreachable, GPU missing, fan alarm." },
          { b: 'Evidence', s: "Collect before touching anything: dmesg [[xid|Xid]] lines, [[nvidia-smi|nvidia-smi -q]], [[dcgm|DCGM]] health, [[nvsm|nvsm show health]], BMC [[sel|SEL]] and sensors, ibstat / [[mlxlink|mlxlink]], lspci." },
          { b: 'Isolate', s: "Is it the workload, one GPU, one node, one link or the fabric? Compare against a known-good peer; move the test, not the hardware." },
          { b: 'Fix', s: "[[node-drain|Drain]] the node, then reset, reseat, reconfigure or replace (next lesson)." },
          { b: 'Verify', s: "Re-run the test that failed plus dcgmi diag, then return the node to service." },
        ]},
        { t: 'callout', kind: 'exam', title: 'Collect evidence before the reboot', x: "A reboot or GPU reset clears volatile ECC counters, driver state and sometimes the error itself. When a stem asks for the **first** step after a hardware-looking fault on a production node, the answer is usually 'drain the node and collect logs (nvidia-bug-report.sh / nvsm dump health)', not 'reboot'." },

        { t: 'h2', x: 'Where the evidence lives' },
        { t: 'table', head: ['Source', 'Command', 'What it tells you'], rows: [
          ['Kernel log', '`dmesg -T | grep -i -E "xid|nvrm|aer"`', '[[xid|Xid]] codes with PCI bus ID, PCIe AER errors, driver load failures'],
          ['GPU state', '`nvidia-smi -q` (or `-q -d ECC,ROW_REMAPPER,PERFORMANCE,TEMPERATURE,POWER`)', '[[ecc|ECC]] counts, row remapping, [[clock-event-reasons|throttle reasons]], temperatures, power draw, serial, bus ID'],
          ['GPU scripted', '`nvidia-smi --query-gpu=index,pci.bus_id,serial,temperature.gpu,power.draw,clocks.sm,ecc.errors.uncorrected.volatile.total --format=csv`', 'One row per GPU — easy to diff against peer nodes'],
          ['DCGM', '`dcgmi health -g <grp> -c`, `dcgmi diag -r 3`', 'Passive [[dcgm-health|health watch]] results; active stress diagnostics'],
          ['DGX system', '`nvsm show health`, `nvsm show alerts`', 'Whole-system health: GPUs, drives, PSUs, fans, NICs, firmware'],
          ['BMC', '`ipmitool sel elist`, `ipmitool sdr type Fan`, `ipmitool sdr type "Power Supply"`, [[redfish|Redfish]] Chassis Thermal/Power', 'PSU and fan faults, thermal trips — survives OS crashes'],
          ['InfiniBand NIC', '`ibstat`, `mlxlink -d mlx5_0 -c -e`, `perfquery`', '[[ib-port-state|Port state]], rate, BER, symbol errors, link-down counters'],
          ['PCIe', '`lspci -vv -s <bdf> | grep -E "LnkCap|LnkSta"`', '[[pcie-link-degraded|Negotiated speed/width]] vs. capability'],
          ['Fabric services', '`systemctl status nvidia-fabricmanager`', '[[fabric-manager|Fabric Manager]] running and version-matched'],
        ]},

        { t: 'h2', x: 'GPU faults: read the Xid first' },
        { t: 'p', x: "The driver logs every GPU event to the kernel log as `NVRM: Xid (PCI:0000:xx:00): <code>, ...`. The bus ID in that line is how you know **which** GPU; the code tells you **what class** of problem it is." },
        { t: 'code', lang: 'bash', title: 'Typical dmesg lines', x: `$ sudo dmesg -T | grep -i xid
[Tue Sep 23 02:14:07] NVRM: Xid (PCI:0000:1b:00): 79, pid=..., GPU has fallen off the bus.
[Tue Sep 23 04:51:30] NVRM: Xid (PCI:0000:c3:00): 74, pid=..., NVLink: fatal error detected on link 7
[Tue Sep 23 09:02:11] NVRM: Xid (PCI:0000:9a:00): 13, pid=48121, Graphics Exception ...` },
        { t: 'table', head: ['Xid', 'Meaning', 'Usual class', 'Next step'], rows: [
          ['13, 31, 43', 'Graphics engine exception, MMU fault, GPU stopped processing', 'Application / driver (usually)', 'Check the job and CUDA code; if it follows one GPU across different jobs, treat as hardware'],
          ['45', 'Preemptive cleanup after another error', 'Follow-on', 'Look for the Xid that came before it'],
          ['48', 'Double-bit (uncorrectable) ECC error', 'Hardware', 'Drain; reset GPU; check row remapping; RMA if it recurs'],
          ['63, 64', 'Row-remapping event / remap failure', 'Hardware (memory)', '63: reset to apply the pending remap. 64 / remap failure: RMA'],
          ['74', '[[nvlink|NVLink]] error', 'Hardware / fabric', 'nvidia-smi nvlink -s and -e; check Fabric Manager; reset; RMA GPU or baseboard if persistent'],
          ['79', '[[gpu-fell-off-bus|GPU fallen off the bus]]', 'Hardware / PCIe / power / thermal', 'Drain, collect logs, cold power-cycle via BMC, check PCIe and thermals; RMA if it recurs'],
          ['92', 'High single-bit ECC error rate', 'Hardware (early warning)', 'Monitor; plan replacement if the rate keeps rising'],
          ['94 / 95', 'Contained / uncontained ECC error', 'Hardware', '94: affected app killed, others continue — reset when possible. 95: reset the GPU immediately'],
        ]},
        { t: 'callout', kind: 'trap', title: 'Application Xids are not RMA tickets', x: [
          "Xid 13, 31 and 43 are very often caused by the user's code (bad memory access, illegal instruction). If the same Xid appears on **different** GPUs, each time with the same job, suspect the job. If it appears on **one** GPU with **any** job, suspect the GPU.",
          "Xid 48, 74, 79, 95 and row-remap failures are hardware-class and justify draining the node.",
        ]},

        { t: 'h3', x: 'Memory health: ECC, retired pages and row remapping' },
        { t: 'code', lang: 'bash', x: `nvidia-smi -q -d ECC            # volatile vs aggregate, correctable vs uncorrectable
nvidia-smi -q -d ROW_REMAPPER   # A100/H100+: Correctable/Uncorrectable remaps, Pending, Remapping Failure
nvidia-smi -q -d PAGE_RETIREMENT  # pre-Ampere GPUs used page retirement instead` },
        { t: 'ul', items: [
          "**Pending: Yes** — a remap is waiting; reset the GPU (or reboot) to apply it. Not yet an RMA.",
          "**Remapping Failure Occurred: Yes** — the GPU ran out of spare rows. Replace the GPU.",
          "**Volatile** counters reset with the driver/GPU; **aggregate** counters persist in the InfoROM — use aggregate to judge a GPU's history.",
        ]},

        { t: 'h3', x: 'Performance faults: throttle reasons' },
        { t: 'p', x: "A GPU that is 'slow but not broken' usually shows up in the [[clock-event-reasons|clock event reasons]]. Newer drivers label the section 'Clocks Event Reasons'; older ones 'Clocks Throttle Reasons'." },
        { t: 'code', lang: 'bash', x: `nvidia-smi -q -d PERFORMANCE
nvidia-smi --query-gpu=index,clocks.sm,temperature.gpu,power.draw,clocks_throttle_reasons.active,\\
clocks_throttle_reasons.hw_slowdown,clocks_throttle_reasons.hw_thermal_slowdown,\\
clocks_throttle_reasons.hw_power_brake_slowdown --format=csv` },
        { t: 'table', head: ['Active reason', 'Likely cause', 'Where to look next'], rows: [
          ['SW Power Cap', 'Running at the configured power limit — normal under heavy load', 'Only a problem if the power limit was lowered (`nvidia-smi -q -d POWER`)'],
          ['HW Thermal Slowdown / SW Thermal Slowdown', 'GPU too hot', 'Fan RPM and fan faults in BMC, inlet temperature, blocked airflow, blanking panels'],
          ['HW Slowdown', 'Hardware-asserted slowdown (thermal or power event)', 'BMC SEL, sensors, PSU status'],
          ['HW Power Brake Slowdown', 'Platform asserted power brake — often PSU loss or insufficient power', 'PSU status in `ipmitool sdr` / `nvsm show psus`, PDU/feed'],
          ['Applications Clocks Setting', 'Someone set application clocks below max', 'Reset with `nvidia-smi -rac`'],
        ]},

        { t: 'h3', x: 'GPU missing from nvidia-smi' },
        { t: 'ol', items: [
          "Is it on the PCIe bus at all? `lspci | grep -i nvidia` — count the devices. Missing from lspci = hardware, seating, power or BIOS; present in lspci but not nvidia-smi = driver or GPU initialisation.",
          "Check dmesg for Xid 79, 'RmInitAdapter failed' or AER errors on that bus ID.",
          "On HGX/DGX, check [[fabric-manager|Fabric Manager]]: `systemctl status nvidia-fabricmanager`. A stopped service or driver/FM version mismatch leaves CUDA reporting 'system not yet initialized'.",
          "Check BMC SEL and sensors for power or thermal events on the GPU tray.",
          "Cold power-cycle via BMC (not just a warm reboot). If the GPU stays missing, open an [[rma|RMA]].",
        ]},

        { t: 'h2', x: 'Fans, thermals and power supplies' },
        { t: 'p', x: "Fans and PSUs are managed by the [[bmc|BMC]], so the evidence is out-of-band and survives a hung OS. On DGX, [[nvsm|NVSM]] aggregates the same data." },
        { t: 'code', lang: 'bash', title: 'Out-of-band checks', x: `ipmitool -I lanplus -H <bmc> -U <user> -P <pw> sel elist | tail -20
ipmitool -I lanplus -H <bmc> -U <user> -P <pw> sdr type Fan              # RPM per fan, 'ns'/critical = problem
ipmitool -I lanplus -H <bmc> -U <user> -P <pw> sdr type "Power Supply"   # presence, failure, AC lost
ipmitool -I lanplus -H <bmc> -U <user> -P <pw> sdr type Temperature

# Redfish equivalents
curl -sku <user>:<pw> https://<bmc>/redfish/v1/Chassis/<id>/Thermal
curl -sku <user>:<pw> https://<bmc>/redfish/v1/Chassis/<id>/Power

# DGX in-band
nvsm show health
nvsm show fans
nvsm show psus` },
        { t: 'table', head: ['Symptom', 'Likely cause', 'Evidence'], rows: [
          ['All GPUs in one node thermally throttle; peers fine', 'Failed fan module or blocked airflow', 'Fan RPM 0 / critical in `sdr type Fan`; SEL fan event'],
          ['One GPU hotter than the rest', 'Local airflow issue, heatsink/thermal-interface issue, or failing GPU', 'Per-GPU temperature in nvidia-smi; compare slot position'],
          ['HW Power Brake under load; SEL shows PSU event', 'PSU failed — redundancy lost', '`sdr type "Power Supply"` shows failure or AC lost'],
          ['Node powers off under HPL', 'Insufficient PSU capacity or failed PSUs / feed', 'SEL power events, PDU logs'],
          ['Fan runs at 100% constantly', 'Sensor failure or BMC fallback mode after a fault', 'SEL, BMC health, firmware version'],
        ]},
        { t: 'callout', kind: 'warn', title: 'Redundancy lost is still a fault', x: "A node with N+N or N+1 PSUs keeps running after one PSU fails, so jobs may look fine. But the next failure takes the node down, and some platforms throttle GPUs when power headroom drops. Treat 'redundancy lost' as a planned replacement — PSUs are normally [[hot-swap|hot-swappable]]." },

        { t: 'h2', x: 'NIC and link faults' },
        { t: 'code', lang: 'bash', x: `$ ibstat mlx5_3
CA 'mlx5_3'
    Port 1:
        State: Active            # logical state
        Physical state: LinkUp   # physical layer
        Rate: 400                # NDR expected

$ sudo mlxlink -d mlx5_3 -c -e     # link info, BER counters, eye opening
$ perfquery -x <lid> 1             # extended port counters (SymbolErrors, LinkDowned, RcvErrors)` },
        { t: 'table', head: ['ibstat shows', 'Meaning', 'Action'], rows: [
          ['Physical: Polling, State: Down', 'No physical link', 'Cable/transceiver seated? Far-end port enabled? Swap cable, try known-good port'],
          ['Physical: LinkUp, State: Initializing', 'Link up but no [[subnet-manager|subnet manager]] has configured it', 'Check SM/[[ufm|UFM]] is running and reachable'],
          ['Active, Rate: 200 (expected 400)', 'Link negotiated below spec', 'Wrong/faulty cable or optic, mismatched port config; mlxlink'],
          ['Active, but LinkDowned counter increasing', 'Link flapping', 'Symbol errors/[[ber|BER]] in mlxlink; clean or replace optics/cable'],
          ['Port shows Ethernet link layer', 'NIC in wrong mode', '[[connectx|mlxconfig LINK_TYPE]] set to IB, reset'],
        ]},

        { t: 'h3', x: 'PCIe degradation' },
        { t: 'code', lang: 'bash', x: `$ sudo lspci -vv -s 1b:00.0 | grep -E "LnkCap:|LnkSta:"
    LnkCap: Port #0, Speed 32GT/s, Width x16
    LnkSta: Speed 32GT/s, Width x8 (downgraded)     # <-- half the lanes trained
$ sudo dmesg | grep -i aer                          # corrected/uncorrected PCIe errors` },
        { t: 'p', x: "A [[pcie-link-degraded|downgraded link]] halves (or worse) host-to-device and GPUDirect bandwidth without any Xid. Reseat the card or riser, check the slot, and compare with the same slot on a peer node. Remember that GPUs can lower link speed at idle for power saving, so check while under load." },

        { t: 'h2', x: 'Which physical GPU is it?' },
        { t: 'p', x: "The error names a PCI bus ID; the technician needs a physical slot and a serial number. Build the mapping from software, then confirm on the hardware." },
        { t: 'code', lang: 'bash', x: `nvidia-smi --query-gpu=index,pci.bus_id,serial,uuid --format=csv
nvidia-smi -q -i 0000:1B:00.0 | grep -E "Serial|Bus Id|Module|Part Number"
ipmitool chassis identify 300     # light the locator LED for 5 minutes (or 'force')` },
        { t: 'ul', items: [
          "Use the **serial number** and **bus ID** in the RMA — not the nvidia-smi index. The index order is driver enumeration order and need not match slot labels; CUDA's default device order can differ again (CUDA_DEVICE_ORDER).",
          "On HGX/DGX the service manual maps bus IDs / module IDs to physical GPU positions on the baseboard.",
          "Light the [[chassis-identify|chassis identify LED]] so the right server is pulled in a rack of identical nodes.",
        ]},

        { t: 'h2', x: 'Isolating: workload, GPU, node, link or fabric?' },
        { t: 'vs', cards: [
          { h: 'Points to the node/GPU', items: [
            'Same GPU bus ID fails with different jobs',
            'dcgmi diag -r 3 fails on this node, passes on peers',
            'Single-node NCCL busbw low on this node only',
            'SEL shows fan/PSU/thermal events',
          ]},
          { h: 'Points elsewhere', items: [
            'Failures follow a particular job or container image → workload',
            'Multi-node NCCL slow, single-node fine → NIC, cable or fabric',
            'All nodes on one leaf slow → switch or uplink',
            'Every 8-GPU node refuses CUDA after an upgrade → driver/Fabric Manager mismatch',
          ]},
        ]},
        { t: 'callout', kind: 'tip', title: 'Docs worth skimming', x: [
          "[DCGM debugging and troubleshooting](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/debugging-and-troubleshooting.html)",
          "[NVSM user guide](https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/latest/)",
          "[nvidia-smi documentation](https://docs.nvidia.com/deploy/nvidia-smi/index.html)",
        ]},
      ],
    },

    /* =====================================================================
       Lesson 2 — Component replacement (5.3)
       ===================================================================== */
    {
      id: 'component-replacement',
      title: 'Replacing faulty cards, GPUs and power supplies',
      minutes: 13,
      blocks: [
        { t: 'lede', x: "Objective 5.3 is about doing a replacement safely and completely: the node leaves the scheduler cleanly, the evidence reaches support, the right part is swapped the right way, its firmware matches the fleet, and the node is proven healthy before it takes jobs again." },

        { t: 'h2', x: 'The replacement workflow' },
        { t: 'flow', steps: [
          { b: '1. Drain', s: "[[node-drain|Drain]] in Slurm or cordon/drain in Kubernetes so running jobs finish and nothing new lands." },
          { b: '2. Collect', s: "[[nvidia-bug-report|nvidia-bug-report.sh]] and/or [[nvsm|nvsm dump health]], dcgmi diag output, [[sel|SEL]], part serial numbers." },
          { b: '3. Open the case', s: "[[rma|RMA]] with NVIDIA Enterprise Support or the OEM; confirm whether it is a customer-replaceable part or a field-service action." },
          { b: '4. Replace', s: "Per the service manual: [[hot-swap|hot-swap]] parts live; cold-swap parts after shutdown and power removal, with ESD protection." },
          { b: '5. Align firmware', s: "Bring the new part to the fleet's firmware/VBIOS/NIC firmware level." },
          { b: '6. Validate', s: "dcgmi diag -r 3, NCCL, HPL (or the test that originally failed)." },
          { b: '7. Resume', s: "`scontrol update nodename=<n> state=resume` or `kubectl uncordon <n>`." },
        ]},

        { t: 'h2', x: 'Step 1 — take the node out of service' },
        { t: 'code', lang: 'bash', title: 'Slurm', x: `scontrol update nodename=dgx-a07 state=drain reason="Xid79 GPU 0000:1b:00.0 SN 1650xxxx case#12345"
sinfo -R                                 # confirm reason; node shows 'drng' until jobs finish, then 'drain'
# ... after repair and validation:
scontrol update nodename=dgx-a07 state=resume` },
        { t: 'code', lang: 'bash', title: 'Kubernetes', x: `kubectl cordon dgx-a07
kubectl drain dgx-a07 --ignore-daemonsets --delete-emptydir-data
# ... after repair and validation:
kubectl uncordon dgx-a07` },
        { t: 'callout', kind: 'trap', title: 'drain vs. down', x: "`state=drain` lets running jobs complete and blocks new ones. `state=down` marks the node unusable immediately and its running jobs are lost. For a node that is still limping along, drain is the courteous and expected answer; Slurm itself may set a node DOWN when slurmd stops responding. A good drain **reason** (Xid, bus ID, case number) is part of the answer — it is how the next admin knows why." },
        { t: 'p', x: "On a [[bcm|BCM]]-managed cluster the same drain/undrain can be driven from cmsh or Base View, which updates the workload manager for you." },

        { t: 'h2', x: 'Step 2 — collect evidence' },
        { t: 'code', lang: 'bash', x: `sudo nvidia-bug-report.sh            # -> nvidia-bug-report.log.gz in the current dir
sudo nvsm dump health                # DGX: full support bundle (tarball under /tmp by default)
dcgmi diag -r 3 > diag-$(hostname).txt
ipmitool sel elist > sel-$(hostname).txt
nvidia-smi --query-gpu=index,pci.bus_id,serial --format=csv` },
        { t: 'callout', kind: 'exam', title: 'What support asks for', x: "For a GPU issue on a DGX, NVIDIA Enterprise Support typically wants the **nvsm dump health** bundle (or nvidia-bug-report on non-DGX), the system serial number and the failing component's serial. Collect them **before** power-cycling, which can clear the failure state." },

        { t: 'h2', x: 'Step 3/4 — what can you replace yourself?' },
        { t: 'table', head: ['Component', 'Typical swap type', 'Notes'], rows: [
          ['Power supply unit', 'Hot-swap (redundant PSUs)', "Confirm remaining PSUs are healthy and can carry the load first; check the new PSU's status LED and SEL afterwards"],
          ['Fan module', 'Hot-swap on most GPU servers', 'Replace quickly — extended open slots disturb airflow; confirm RPM in `sdr type Fan`'],
          ['NVMe data / cache drive', 'Hot-swap (front bays)', 'On DGX the /raid [[raid-cache|RAID 0 cache]] must be rebuilt afterwards; boot drives are mirrored'],
          ['ConnectX / network card', 'Cold-swap', 'Shutdown, power removed, ESD; follow the service manual steps for the network module; then firmware + link validation'],
          ['DIMM', 'Cold-swap', 'Match part number; check SEL / memory errors after'],
          ['GPU / HGX GPU tray', 'Cold-swap; on DGX H100-class systems typically an NVIDIA field-service action', 'Heavy, ESD-sensitive and connected to NVSwitch; follow your support entitlement and the service manual'],
        ]},
        { t: 'callout', kind: 'warn', title: 'Service manual is the authority', x: [
          "The [DGX A100 service manual](https://docs.nvidia.com/dgx/pdf/dgxa100-service-manual.pdf) (and its H100/B200 equivalents) lists which components are customer-replaceable, the exact order of steps, and which require NVIDIA field service. Exam answers that skip the manual ('just pull the card') are wrong.",
          "Wear an ESD strap, work on an ESD mat, and remove AC power (all PSU cords) before cold-swapping. A server with standby power still has live rails even when 'off'.",
        ]},

        { t: 'h2', x: 'Step 5 — firmware alignment' },
        { t: 'p', x: "Replacement parts arrive with whatever firmware was on the shelf. A cluster where one NIC or GPU runs a different version is a source of subtle faults (link training differences, NCCL behaviour, Fabric Manager issues on HGX)." },
        { t: 'code', lang: 'bash', x: `nvidia-smi -q | grep -i -E "VBIOS|Inforom"      # GPU VBIOS
sudo mlxfwmanager --query                          # ConnectX / BlueField firmware
sudo flint -d mlx5_0 q                             # single device
nvsm show firmware                                 # DGX: firmware inventory vs. expected` },
        { t: 'ul', items: [
          "On DGX use the DGX firmware update container / documented update procedure to bring the whole system to the release baseline; on HGX update the [[hgx|HGX]] tray as a bundle.",
          "For [[connectx|ConnectX]] cards also re-apply persistent settings (`mlxconfig` LINK_TYPE, etc.) — a new card can boot in the wrong mode.",
          "After a NIC swap, the interface name and GUID change; update anything keyed to them (BCM interface definitions, UFM/SM configs, host-based inventories).",
        ]},

        { t: 'h2', x: 'Step 6 — prove it before resuming' },
        { t: 'table', head: ['Replaced', 'Minimum validation'], rows: [
          ['GPU / GPU tray', '`nvidia-smi` shows all GPUs; `dcgmi diag -r 3`; single-node [[nccl|NCCL]] all_reduce busbw; [[hpl|HPL]] passes residual'],
          ['NIC / cable', '`ibstat` Active at full rate; mlxlink BER clean; [[perftest|ib_write_bw]] to a peer; multi-node NCCL'],
          ['PSU', 'SEL clear of new events; `sdr type "Power Supply"` all present/OK; HPL under full power without power-brake throttling'],
          ['Fan', 'All fans at normal RPM; GPUs no thermal slowdown under HPL'],
          ['NVMe', '/raid array rebuilt and mounted; [[fio|fio]] throughput as expected'],
        ]},
        { t: 'callout', kind: 'exam', title: 'Validation is not optional', x: "The expected final step is always 'run diagnostics / benchmarks, then return to service'. An answer that resumes the node immediately after the physical swap is a distractor." },
      ],
    },

    /* =====================================================================
       Lesson 3 — Optimisation (5.4, 5.5)
       ===================================================================== */
    {
      id: 'optimization',
      title: 'Optimising AMD/Intel servers and storage',
      minutes: 15,
      blocks: [
        { t: 'lede', x: "Objectives 5.4 and 5.5: healthy hardware can still under-deliver because of BIOS defaults, poor NUMA placement or a storage path that cannot keep GPUs fed. Questions describe a symptom — P2P bandwidth low, one rank slower, epochs stall on I/O — and ask for the setting that fixes it." },

        { t: 'h2', x: 'BIOS: the settings that matter' },
        { t: 'p', x: "Start from the server's [[nvidia-certified|NVIDIA-Certified]] configuration guide or DGX defaults. They exist because generic 'balanced' BIOS profiles are tuned for power efficiency, not GPU throughput." },
        { t: 'table', head: ['Setting', 'AMD EPYC', 'Intel Xeon', 'Why'], rows: [
          ['Power profile', 'Performance / Determinism = Performance; APBDIS where recommended', 'Performance profile; Energy Performance Bias = Performance', '[[bios-power-profile|Max sustained clocks]], fewer frequency transitions'],
          ['CPU C-states', 'Limit deep Global C-states if the guide says so', 'Limit C6 / package C-states if the guide says so', 'Deep sleep adds wake latency and jitter'],
          ['NUMA layout', 'NPS (NPS1 / NPS2 / NPS4)', 'Sub-NUMA Clustering off / SNC2 / SNC4', '[[numa-nps|Locality]] vs. simplicity — match the platform guide'],
          ['SMT / Hyper-Threading', 'SMT on/off', 'HT on/off', 'Workload-dependent; HPC codes sometimes prefer off, AI data loaders often benefit from on'],
          ['IOMMU', 'Off or passthrough for bare metal', 'VT-d off or passthrough for bare metal', '[[acs-iommu|DMA translation]] overhead / P2P'],
          ['PCIe ACS', 'Disable on PCIe switches for P2P', 'Disable on PCIe switches for P2P', 'Lets GPU↔GPU and GPU↔NIC traffic stay under the switch'],
          ['PCIe', 'Max Read Request Size raised (e.g. 4096) where the NIC guide recommends', 'Same', 'Better large-transfer efficiency for NICs'],
        ]},
        { t: 'callout', kind: 'trap', title: 'ACS on = P2P detour', x: "With ACS enabled on a PCIe switch, peer-to-peer transactions between a GPU and its neighbour NIC or GPU are forced up to the CPU root complex. Everything still works — just slowly. Symptom: GPUDirect RDMA or P2P bandwidth well below expected, sometimes NCCL P2P errors or hangs. Fix: disable ACS (BIOS option or setpci at boot) and use `iommu=pt` (or IOMMU off) on bare metal." },
        { t: 'code', lang: 'bash', title: 'OS-side checks', x: `cat /proc/cmdline                               # iommu=pt / amd_iommu=on iommu=pt present?
sudo lspci -vvv | grep -i "ACSCtl"              # ACSCtl: SrcValid+ ... means ACS enabled on that port
cpupower frequency-info | grep governor
sudo cpupower frequency-set -g performance      # performance governor
nvidia-smi -pm 1                                # persistence mode (or nvidia-persistenced)` },

        { t: 'h2', x: 'GPU–NIC–CPU affinity' },
        { t: 'code', lang: 'bash', x: `$ nvidia-smi topo -m
        GPU0  GPU1  ...  NIC0  NIC1  CPU Affinity   NUMA Affinity
GPU0     X    NV18  ...  PIX   SYS   0-55           0
GPU1    NV18   X    ...  SYS   PIX   0-55           0
...
Legend: X=self  NV#=NVLink  PIX=same PCIe switch  PXB=multiple switches
        PHB=via host bridge  NODE=same NUMA node, across host bridges  SYS=across sockets` },
        { t: 'ul', items: [
          "**PIX/PXB** between a GPU and a NIC is the best case for [[rdma|GPUDirect RDMA]]; **SYS** means traffic crosses the socket interconnect.",
          "Bind each rank to its GPU's NUMA node: `numactl --cpunodebind=0 --membind=0 ./app` or in Slurm `srun --cpu-bind=cores --gpu-bind=closest ...` (with a gres.conf that declares GPU Cores).",
          "Pin NCCL to the NIC nearest each GPU (NCCL normally discovers this from topology; `NCCL_IB_HCA` can restrict the list).",
          "Keep [[persistence-mode|persistence mode]] on; set power limits (`nvidia-smi -pl`) and application clocks (`nvidia-smi -ac`) only deliberately — a lowered power limit shows up as SW Power Cap throttling.",
        ]},
        { t: 'callout', kind: 'exam', title: 'Symptom → setting', x: [
          "One rank per node consistently slower, same hardware → [[cpu-affinity|affinity]]: process on the far NUMA node.",
          "Host-to-device copies half expected on all GPUs → check PCIe link width/speed and NPS/SNC + binding.",
          "Jitter in collective latency → C-states / power profile / governor.",
          "GPUDirect RDMA slow, P2P test poor → ACS and IOMMU.",
        ]},

        { t: 'h2', x: 'Storage: keep the GPUs fed' },
        { t: 'p', x: "Training reads the same dataset every epoch. The storage objective is less about the array and more about the client path: local cache, network mount options, RDMA and the data loader." },
        { t: 'table', head: ['Layer', 'Optimisation', 'Detail'], rows: [
          ['Local NVMe', '[[raid-cache|DGX /raid RAID 0]]', 'Stage hot datasets locally; non-redundant scratch'],
          ['NFS cache', '[[fs-cache|cachefilesd / FS-Cache]]', 'Cache NFS reads on /raid; mount with `fsc`'],
          ['NFS mount', '[[nfs-tuning|nconnect, rsize/wsize, proto=rdma]]', '`nconnect=16`, `rsize=1048576,wsize=1048576`, NFS over RDMA'],
          ['Network', 'Jumbo frames', 'MTU 9000 consistent host → switch → filer; RDMA ([[roce|RoCE]] or IB) for the storage fabric'],
          ['Parallel FS', '[[parallel-fs|Client tuning]]', "Vendor client (Lustre, Storage Scale, WEKA, VAST…) with RDMA, multiple connections/rails, vendor-recommended striping"],
          ['GPU path', '[[gds|GPUDirect Storage]]', '`gdscheck -p` to verify; nvidia-fs module loaded; supported FS/driver'],
          ['Application', 'Data loader parallelism', 'Enough DataLoader workers, pinned memory, prefetch; GPU decode with DALI; ETL on GPU with [[rapids-cudf|RAPIDS cuDF]]'],
        ]},
        { t: 'code', lang: 'bash', title: 'NFS client example', x: `# /etc/fstab — tuned NFS with local caching
filer:/datasets  /mnt/datasets  nfs  rw,vers=3,nconnect=16,rsize=1048576,wsize=1048576,hard,fsc  0 0

# or NFS over RDMA
mount -t nfs -o vers=3,proto=rdma,port=20049,rsize=1048576,wsize=1048576 filer:/datasets /mnt/datasets

sudo systemctl enable --now cachefilesd     # dir= in /etc/cachefilesd.conf -> e.g. /raid/fscache
ip link set dev <if> mtu 9000                # persist in netplan / BCM interface config
gdscheck -p                                  # GDS platform support and configuration` },
        { t: 'callout', kind: 'trap', title: 'Where the time actually goes', x: [
          "GPU utilisation saw-toothing between 0% and 100% with idle gaps at batch boundaries usually means the **input pipeline** is the bottleneck — add loader workers, cache locally or move preprocessing to the GPU before buying faster storage.",
          "FS-Cache speeds up **re-reads**; the first epoch still runs at network speed.",
          "An MTU of 9000 on the host but 1500 on a switch port gives fragmentation or dropped large frames — worse than no jumbo frames at all.",
        ]},

        { t: 'h3', x: 'Spotlight: VAST and BlueField' },
        { t: 'p', x: "NVIDIA's guidance on [choosing the right storage for enterprise AI](https://developer.nvidia.com/blog/choosing-the-right-storage-for-enterprise-ai-workloads/) stresses matching storage to the workload phase (ingest, training reads, checkpoints) and using RDMA/GPUDirect-capable paths. VAST Data is a commonly cited example: its data platform can run services on [[bluefield|BlueField]] DPUs, offloading storage-client and data-path work from the host CPUs so they remain free for the application. Expect it as a qualitative 'which offload helps storage throughput and host CPU headroom' idea rather than as configuration detail." },

        { t: 'h2', x: 'Checklist' },
        { t: 'specs', rows: [
          ['BIOS', 'Performance profile, C-states per guide, NPS/SNC per guide, ACS off, IOMMU pt/off (bare metal)'],
          ['OS', 'performance governor, persistence mode, kernel cmdline iommu=pt, jumbo MTU on storage NICs'],
          ['Placement', 'nvidia-smi topo -m; numactl / Slurm --cpu-bind and --gpu-bind; GPU↔NIC PIX'],
          ['Storage', '/raid cache, cachefilesd + fsc, nconnect / NFS-RDMA, rsize/wsize 1 MiB, GDS verified'],
          ['Application', 'DataLoader workers, pinned memory, DALI / RAPIDS cuDF for GPU preprocessing'],
        ]},
      ],
    },
  ],

  /* =====================================================================
     Module quiz — 10 questions
     ===================================================================== */
  quiz: [
    { id: 't01', domain: 'troubleshoot',
      scenario: "During a multi-day training run, dmesg on node dgx-b12 shows 'NVRM: Xid (PCI:0000:c3:00): 79, GPU has fallen off the bus.' nvidia-smi now errors for that GPU. Other nodes are healthy.",
      q: 'What is the most appropriate first course of action?',
      opts: [
        'Reload the nvidia kernel module and return the node to the Slurm partition',
        'Drain the node in Slurm, collect nvidia-bug-report / nvsm dump health, then power-cycle via the BMC and investigate',
        'Reboot all nodes in the job to clear the NCCL communicator',
        'Lower the GPU power limit with nvidia-smi -pl and resume the job',
      ],
      a: 1,
      why: "Xid 79 is a hardware-class event: the GPU is unreachable on PCIe. Take the node out of scheduling, capture evidence before a reset clears it, then cold-reset through the BMC and check PCIe, power and thermals. A recurrence on the same GPU means RMA.",
      distract: "**Reloading the driver** and returning the node ignores a hardware fault. **Rebooting every node** treats a single-node fault as a fabric problem. **Lowering the power limit** does not address a GPU that has dropped off the bus." },

    { id: 't02', domain: 'troubleshoot',
      scenario: "All eight GPUs in one server run noticeably slower during HPL than identical peers. nvidia-smi -q -d PERFORMANCE shows 'HW Thermal Slowdown: Active' on every GPU; inlet temperature is normal for the row.",
      q: 'Which evidence source should you check next?',
      opts: [
        'ibstat port counters on the compute NICs',
        'The Slurm job accounting database',
        'BMC fan sensors and the SEL (ipmitool sdr type Fan / sel elist)',
        'The NCCL debug log with NCCL_DEBUG=INFO',
      ],
      a: 2,
      why: "Node-wide thermal slowdown with normal inlet temperature points at the chassis cooling — typically a failed or degraded fan module. Fan RPM and fan-fault events live in the BMC sensors and SEL.",
      distract: "**NIC counters** and **NCCL logs** concern the network, not GPU temperature. **Slurm accounting** records usage, not hardware health." },

    { id: 't03', domain: 'troubleshoot',
      q: "nvidia-smi -q -d ROW_REMAPPER on an H100 shows 'Pending: Yes' and 'Remapping Failure Occurred: No'. What should you do?",
      opts: [
        'Open an RMA immediately; the GPU memory has failed',
        'Disable ECC to stop further remapping',
        'Nothing; pending remaps are applied automatically while jobs run',
        'Drain the node and reset the GPU (or reboot) to apply the pending remap, then re-check',
      ],
      a: 3,
      why: "Row remapping on A100/H100 is applied at the next GPU reset. 'Pending: Yes' means a spare row is waiting to be mapped in; resetting applies it. Only a remapping failure (no spare rows left) calls for replacement.",
      distract: "**RMA** is premature without a remap failure. **Disabling ECC** removes protection and is never the fix. Pending remaps are **not** applied while the GPU is in use." },

    { id: 't04', domain: 'troubleshoot',
      scenario: "After a GPU driver upgrade on an 8-GPU HGX H100 node, nvidia-smi lists all GPUs, but every CUDA application fails with 'system not yet initialized'.",
      q: 'What is the most likely cause?',
      opts: [
        'NVIDIA Fabric Manager is not running or its version does not match the new driver',
        'The InfiniBand subnet manager has stopped',
        'Persistence mode was disabled by the upgrade',
        'One GPU has a pending row remap',
      ],
      a: 0,
      why: "NVSwitch-based HGX systems need Fabric Manager to configure NVSwitch routing before CUDA can use the GPUs, and its version must match the driver exactly. Upgrading the driver without Fabric Manager (or leaving it stopped) produces exactly this error.",
      distract: "The **subnet manager** affects InfiniBand, not local CUDA initialisation. **Persistence mode** off slows initialisation but does not block CUDA. A **pending remap** affects one GPU, not every application." },

    { id: 't05', domain: 'troubleshoot',
      scenario: "ibstat on a compute node shows port mlx5_2 with 'State: Initializing' and 'Physical state: LinkUp'. All other ports on the node are Active.",
      q: 'What does this indicate?',
      opts: [
        'The cable is faulty and must be replaced',
        'The NIC is configured in Ethernet mode',
        'The physical link is up, but no subnet manager has configured the port',
        'The port is running at a reduced rate',
      ],
      a: 2,
      why: "LinkUp means the physical layer trained; Initializing means the logical port has not been brought to Active by a subnet manager. Check that the SM (switch, UFM or OpenSM) serving that rail is running and reachable.",
      distract: "A **bad cable** normally leaves the physical state at Polling or Disabled. **Ethernet mode** would show a different link layer. **Reduced rate** would appear in the Rate field on an Active port." },

    { id: 't06', domain: 'troubleshoot',
      q: 'A redundant PSU in a DGX reports a failure in the BMC SEL. Jobs are still running normally. Which statement is correct?',
      opts: [
        'No action is needed while jobs run normally',
        'Replace the PSU as a hot-swap after confirming the remaining PSUs are healthy, because redundancy is lost',
        'Shut down the node immediately and replace the PSU as a cold-swap',
        'Open a field-service request, because PSUs are not customer-replaceable',
      ],
      a: 1,
      why: "The node survives on its remaining PSUs, but redundancy is lost and some platforms throttle GPUs when power headroom drops. PSUs are hot-swappable customer-replaceable units on DGX systems, so replace it live per the service manual.",
      distract: "**Ignoring it** risks an outage on the next failure. **Cold-swap** is unnecessary for a hot-swappable part. PSUs are customer-replaceable, **not** a field-service-only item." },

    { id: 't07', domain: 'troubleshoot',
      scenario: "A ConnectX-7 card in a GPU server was replaced. The node boots and the GPUs pass dcgmi diag, but the new port does not come up on the InfiniBand fabric.",
      q: 'Which step was most likely missed?',
      opts: [
        'Running HPL before bringing up the network',
        'Re-enabling persistence mode on the GPUs',
        'Rebuilding the /raid RAID 0 array',
        'Aligning the new card firmware and persistent settings (e.g. mlxconfig LINK_TYPE=IB) with the fleet',
      ],
      a: 3,
      why: "Replacement NICs arrive with shelf firmware and default settings; a card left in Ethernet mode or on mismatched firmware will not join the IB fabric correctly. Firmware alignment and re-applying mlxconfig settings are part of the replacement procedure.",
      distract: "**HPL**, **persistence mode** and **/raid** have nothing to do with the NIC link coming up." },

    { id: 't08', domain: 'troubleshoot',
      scenario: "On a bare-metal AMD EPYC server, nvidia-smi topo -m shows each GPU and its NIC as PIX, but GPUDirect RDMA bandwidth and GPU peer-to-peer bandwidth are far below expected.",
      q: 'Which BIOS/OS change is most likely to fix this?',
      opts: [
        'Disable PCIe ACS on the switches and set the IOMMU to passthrough (iommu=pt) or off',
        'Enable deeper CPU C-states',
        'Switch the NUMA setting from NPS1 to NPS4 without changing process binding',
        'Enable Sub-NUMA Clustering',
      ],
      a: 0,
      why: "PIX means the GPU and NIC share a PCIe switch, so P2P traffic should stay under that switch. ACS forces it up to the root complex and IOMMU translation adds overhead — the classic cause of poor GPUDirect and P2P bandwidth on bare metal.",
      distract: "**Deep C-states** add latency. **Changing NPS** alone does not affect a path that stays under one PCIe switch. **SNC** is an Intel setting." },

    { id: 't09', domain: 'troubleshoot',
      scenario: "A training job reads the same 20 TB dataset from an NFS filer every epoch over a 400 Gb/s link. The first epoch and later epochs are equally slow, and GPU utilisation shows long idle gaps. The DGX has an unused /raid NVMe array.",
      q: 'Which combination addresses the bottleneck?',
      opts: [
        'Enable MIG to spread the data loading across more GPU instances',
        'Lower rsize/wsize to 4 KB and disable jumbo frames to reduce retransmits',
        'Enable cachefilesd on /raid with the fsc mount option, and add nconnect (or NFS over RDMA) with 1 MiB rsize/wsize',
        'Move the dataset to the DGX boot drive',
      ],
      a: 2,
      why: "Re-reads can be served from FS-Cache on the local NVMe RAID, and nconnect / NFS-RDMA with large transfer sizes removes the single-TCP-connection bottleneck for the first read.",
      distract: "**MIG** partitions compute; it does not speed up I/O. **Tiny rsize/wsize** and disabling jumbo frames reduce throughput. The **boot drive** is small and not designed for dataset I/O." },

    { id: 't10', domain: 'troubleshoot',
      scenario: "A GPU tray on a DGX H100 was replaced by NVIDIA field service. The system boots and nvidia-smi shows eight GPUs.",
      q: 'What should happen before the node is returned to the Slurm partition?',
      opts: [
        'Nothing further; nvidia-smi listing all GPUs is sufficient',
        'Only clear the BMC SEL so old events do not confuse monitoring',
        'Only run dcgmi diag -r 1 because longer diagnostics may wear the new GPUs',
        'Verify firmware matches the fleet, run dcgmi diag -r 3, single-node NCCL and HPL, then scontrol update state=resume',
      ],
      a: 3,
      why: "Post-replacement validation proves the new tray at the fleet firmware level, under stress (DCGM level 3), over NVLink/NVSwitch (NCCL) and at full power (HPL). Only then is the drained node resumed.",
      distract: "**nvidia-smi listing** proves enumeration, not health. **Clearing the SEL** is housekeeping, not validation. **Level 1** is a quick sanity check; longer diagnostics are the expected validation and do not harm GPUs." },
  ],
}
