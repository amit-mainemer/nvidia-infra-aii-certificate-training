/**
 * Module 1 glossary — System and Server Bring-up. Terms specific to deployment,
 * BMC/firmware, power/cooling, physical installation, cabling and storage onboarding.
 * Shared terms (bmc, oob, ipmi, redfish, tpm, sel, linkx, dgx, hgx, …) live in core.js.
 */
export default [
  /* ---------------- Deployment & topology ---------------- */
  { id: 'site-survey', term: 'Site survey', cat: 'Compute & GPUs',
    def: 'The pre-installation audit of the data hall: power capacity and circuit types per rack, cooling capacity and inlet temperature, floor load rating, rack depth and height, delivery path (dock, lift, door heights), and network drop locations.',
    exam: 'The first step of the bring-up sequence. If a scenario describes a problem that should have been caught before hardware arrived (not enough kW per rack, racks too shallow, lift too small), the missed step is the site survey.' },

  { id: 'scalable-unit', term: 'Scalable Unit (SU)', cat: 'Fabric & networking',
    def: 'The repeatable building block of a DGX SuperPOD: a fixed group of DGX nodes (32 DGX H100 systems per SU) plus its leaf switches, cabled identically so the cluster grows by adding whole SUs. A four-SU DGX H100 SuperPOD has 127 compute nodes (one slot is used by UFM).',
    exam: 'SuperPOD scales in SUs; BasePOD is the smaller reference architecture for a handful to a few dozen nodes. Rail-optimised leaves are per SU, spines connect the SUs.' },

  { id: 'superpod', term: 'DGX SuperPOD & DGX BasePOD', cat: 'Fabric & networking',
    def: 'NVIDIA reference architectures for DGX clusters. SuperPOD is the full-scale, turnkey design (scalable units, InfiniBand compute fabric, dedicated storage fabric, BCM, UFM). BasePOD is a smaller, more flexible reference design for smaller deployments with a similar set of networks.',
    exam: 'The deployment guide for SuperPOD is the source for the bring-up order and the four-network layout. When the stem says "reference architecture for a large DGX cluster", think SuperPOD.' },

  { id: 'inband-mgmt', term: 'In-band management network', cat: 'Fabric & networking',
    def: 'The Ethernet network that the host OS uses for provisioning (PXE from BCM), SSH, Slurm control traffic, monitoring and user access. Separate from the BMC/OOB network and from the compute and storage fabrics.',
    exam: 'Do not confuse it with OOB: in-band needs the host OS running; OOB reaches the BMC even when the host is powered off. PXE provisioning runs over in-band.' },

  /* ---------------- Management & firmware ---------------- */
  { id: 'sdr', term: 'SDR (Sensor Data Record)', cat: 'Management & security',
    def: 'The BMC repository describing every sensor (temperatures, fan speeds, voltages, PSU status) and its thresholds. ipmitool sdr / ipmitool sensor list read current values against those thresholds.',
    exam: 'SDR = what the sensors read now; SEL = the history of events. A fan showing "cr" (critical) in the SDR or a PSU "failure detected" event in the SEL are the fastest hardware triage clues.' },

  { id: 'virtual-media', term: 'Virtual media / KVM', cat: 'Management & security',
    def: 'BMC features that present a remote ISO image as a USB CD-ROM to the host (virtual media) and give remote keyboard, video and mouse over the web UI (KVM / remote console).',
    exam: 'How you install DGX OS or reach BIOS setup on a server with no local console. Mounted via the BMC web UI or Redfish VirtualMedia.InsertMedia.' },

  { id: 'nvfwupd', term: 'nvfwupd', cat: 'Management & security',
    def: 'NVIDIA\'s firmware update CLI for DGX and HGX-based systems. Runs from a management host and talks to the BMC over Redfish: show_version lists installed vs. package versions, update_fw applies a .fwpkg bundle to the BMC, BIOS, HGX tray and other components.',
    exam: 'Know the flow: show_version → update_fw with the package → wait for completion → power cycle as required → show_version again to verify. It targets the BMC IP, not the host OS.' },

  { id: 'hmc', term: 'HMC (HGX Management Controller)', cat: 'Management & security',
    def: 'The management controller on the HGX baseboard (Hopper and later) that owns the GPU tray\'s firmware inventory and updates — GPU, NVSwitch, FPGA/CPLD, retimers — and exposes them to the host BMC over Redfish.',
    exam: 'Explains why HGX tray firmware is updated as a coordinated bundle through the BMC/Redfish path rather than per GPU from the OS.' },

  { id: 'fw-activation', term: 'Firmware activation & AC power cycle', cat: 'Management & security',
    def: 'Many firmware images are staged by the update but only take effect after a reset. Some need only a host reboot or BMC reset; others (HGX tray, CPLD, PSU, some BIOS changes) need a full AC power cycle — removing all input power so standby rails and controllers restart.',
    exam: 'If versions still show the old firmware after a "successful" update, the missing step is usually activation — typically an AC power cycle. A warm reboot does not reset standby-powered controllers.' },

  { id: 'fw-baseline', term: 'Firmware baseline (recipe)', cat: 'Management & security',
    def: 'The validated set of firmware versions for every component in a node — BMC, BIOS, GPU, NVSwitch, NIC/DPU, NVMe, PSU — published together and tested as a combination.',
    exam: 'All nodes in a cluster should run the same baseline before burn-in. Mixed firmware across nodes is itself a finding, even when every node individually "works".' },

  /* ---------------- Power, cooling & physical ---------------- */
  { id: 'psu-redundancy', term: 'PSU redundancy (N+1, N+N)', cat: 'Compute & GPUs',
    def: 'N is the number of power supplies needed to carry the full load. N+1 adds one spare; N+N duplicates the whole set so half the PSUs can be lost — e.g. one complete feed. N+N only protects against feed loss if the two halves are cabled to independent A and B feeds.',
    exam: 'Classic trap: all PSUs plugged into the same PDU. The node reports full redundancy but a single PDU or breaker trip takes it down.' },

  { id: 'pdu', term: 'PDU (Power Distribution Unit)', cat: 'Compute & GPUs',
    def: 'The rack power strip fed from a facility circuit. Rated by voltage, phase and current; metered/switched PDUs report load and can be managed over the OOB network. AI racks normally use high-voltage three-phase PDUs in A/B pairs.',
    exam: 'Size so that either PDU (and its upstream circuit) can carry the whole rack on its own, with headroom for derating. Budget from the systems\' maximum power, not the typical draw.' },

  { id: 'inlet-temp', term: 'Inlet temperature & airflow', cat: 'Compute & GPUs',
    def: 'The temperature of the air entering the server\'s front intake — the value thermal specs refer to. Air-cooled GPU servers draw cold-aisle air front-to-back and exhaust into the hot aisle; blanking panels and containment stop hot exhaust recirculating to the intake.',
    exam: 'GPU throttling that follows rack position (top of rack hotter) or appears after equipment moves points at recirculation — missing blanking panels, reversed airflow or broken containment.' },

  { id: 'dlc', term: 'Direct liquid cooling (DLC) & CDU', cat: 'Compute & GPUs',
    def: 'Cold plates on GPUs/CPUs carry heat away in a coolant loop; a coolant distribution unit (CDU) exchanges heat with the facility water loop and controls flow, pressure and temperature. Used by dense systems such as GB200 NVL72.',
    exam: 'Liquid-cooled racks add bring-up steps: leak checks, loop fill and bleed, flow/pressure verification and CDU alarms before power-on. Air-cooled DGX H100/B200 still depend on inlet air temperature.' },

  { id: 'esd', term: 'ESD protection', cat: 'Compute & GPUs',
    def: 'Electrostatic discharge precautions when handling GPUs, DIMMs, NICs and baseboards: grounded wrist strap, ESD mat, anti-static bags, handling cards by the edges or bracket.',
    exam: 'The expected answer whenever a question asks what to do before touching a component. Also: never hot-plug non-hot-swap parts; power off and remove AC first.' },

  { id: 'numa-affinity', term: 'NUMA & PCIe affinity', cat: 'Compute & GPUs',
    def: 'In multi-socket servers each PCIe slot hangs off one CPU (NUMA node). A GPU and the NIC it uses for GPUDirect RDMA should share a PCIe switch or at least a CPU socket; crossing the inter-socket link (SYS in nvidia-smi topo -m) adds latency and cuts bandwidth.',
    exam: 'Read nvidia-smi topo -m: PIX/PXB = good (same PCIe switch path), NODE/PHB = same socket, SYS = crosses sockets. The certified-system guide gives correct slot placement.' },

  /* ---------------- Cables & optics ---------------- */
  { id: 'osfp-qsfp', term: 'OSFP vs. QSFP form factors', cat: 'Cables & optics',
    def: 'Pluggable module cages. OSFP is larger with more power/thermal headroom and hosts 400G and twin-port 800G (2×400G) modules; QSFP (QSFP56, QSFP112) is smaller and common on adapters and Ethernet switches. They are not mechanically interchangeable.',
    exam: 'Quantum-2 NDR switches and DGX H100 compute ports are OSFP. Check the cage type at both ends before ordering cables — an adapter-side QSFP112 needs a different cable/transceiver than a switch-side OSFP.' },

  { id: 'twin-port-osfp', term: 'Twin-port OSFP (2×400G)', cat: 'Cables & optics',
    def: 'An 800G OSFP module carrying two independent 400G NDR links, each with its own fibre connector. Used on Quantum-2 switch ports and on the DGX H100 compute-fabric cages, where eight ConnectX-7 400G ports are exposed through four twin-port OSFP cages. Switch-side modules are finned-top; module variants for adapter/system cages with riding heat sinks are flat-top.',
    exam: 'One physical cage = two logical links. Mixing flat-top and finned-top modules in the wrong cage, or crossing the two fibres of a twin-port module, are real-world bring-up errors.' },

  { id: 'mmf-smf', term: 'Multimode vs. single-mode fibre', cat: 'Cables & optics',
    def: 'Multimode fibre (MMF, e.g. OM4, aqua; 850 nm SR optics) is cheaper for short reaches of tens of metres. Single-mode fibre (SMF, yellow; 1310 nm DR/FR optics) reaches hundreds of metres to kilometres. Transceiver and fibre type must match; MPO connectors for SMF are typically angled (APC).',
    exam: 'SR = multimode = short reach within a row; DR/FR = single-mode = longer runs between rows or halls. An SR transceiver on single-mode fibre (or vice versa) will not link reliably.' },

  { id: 'bend-radius', term: 'Minimum bend radius', cat: 'Cables & optics',
    def: 'The tightest curve a cable may take without damage or signal loss — commonly around ten times the cable diameter for static fibre/AOC runs, larger during pulling. DACs are thick and stiff and need even more room.',
    exam: 'A link that trains but shows rising symbol errors after cable dressing often has a kink, over-tight tie-wrap or excessive bend. Use Velcro, not tight zip ties.' },

  /* ---------------- Storage ---------------- */
  { id: 'nfs-rdma', term: 'NFS over RDMA & nconnect', cat: 'Storage',
    def: 'Client options that raise NFS throughput: proto=rdma (port 20049) moves NFS over RDMA on IB/RoCE; nconnect=N opens several TCP connections per mount; large rsize/wsize (1 MiB) reduce round trips. Combined with jumbo frames (MTU 9000) on Ethernet.',
    exam: 'Initial storage parameters (objective 1.11) are about the client side: correct fabric, MTU matching end to end, RDMA enabled, and the vendor\'s recommended mount options.' },

  { id: 'mtu', term: 'MTU & jumbo frames', cat: 'Fabric & networking',
    def: 'Maximum transmission unit — the largest frame an interface sends. Ethernet storage and RoCE networks typically use jumbo frames (MTU 9000 or vendor-specified); InfiniBand uses a 4096-byte IB MTU. Every hop — host, switch, storage — must agree.',
    exam: 'Symptom of an MTU mismatch: small transfers work, large ones hang or crawl. Test with ping -M do -s 8972 <target> on a 9000-MTU path.' },
]
