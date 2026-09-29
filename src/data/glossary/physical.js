/**
 * Module 2 glossary — Physical Layer Management (BlueField and MIG).
 * Shared terms (bluefield, doca, mig, nvidia-smi, mlxlink, bmc, oob, redfish …) live in core.js.
 */
export default [
  /* ---------------- BlueField ---------------- */
  { id: 'dpu-mode', term: 'DPU mode (ECPF / embedded)', cat: 'Fabric & networking',
    def: 'The default BlueField operating mode. The Arm subsystem is the "embedded CPU function" owner of the NIC: it runs the eSwitch (OVS), sees the uplinks (p0/p1) and a representor per host function (pf0hpf, pf0vfN), and every host packet passes through rules the Arm side programs. Selected with INTERNAL_CPU_MODEL=1 (EMBEDDED_CPU).',
    exam: 'DPU mode = Arm cores active and in control of the data path. Needed for OVS offload, storage emulation, security isolation and anything DOCA runs on the card.' },

  { id: 'nic-mode', term: 'NIC mode', cat: 'Fabric & networking',
    def: 'A BlueField operating mode in which the Arm cores do not own the data path and the card behaves like a ConnectX adapter to the host. On BlueField-3 it is set with mlxconfig INTERNAL_CPU_OFFLOAD_ENGINE=1 (0 = DPU mode) followed by a power cycle.',
    exam: 'Pick NIC mode when the stem wants "maximum simplicity / plain ConnectX behaviour" and no Arm-side services. Switching modes is an mlxconfig change that only takes effect after a cold reboot or firmware reset.' },

  { id: 'zero-trust', term: 'Zero-trust / restricted host mode', cat: 'Management & security',
    def: 'A DPU-mode variant in which the host is restricted from changing the BlueField: it cannot burn firmware, change mlxconfig parameters or modify eSwitch rules. Configured from the Arm side (mlxprivhost … r to restrict, … p to return privileges) or by the BMC, so the DPU is managed only from the trusted Arm/OOB side.',
    exam: 'Answer when the stem says "the host (or a bare-metal tenant) must not be able to reconfigure or reflash the NIC". The host still gets network service; it just loses management privileges.' },

  { id: 'separated-host', term: 'Separated host mode (legacy)', cat: 'Fabric & networking',
    def: 'An older BlueField mode (INTERNAL_CPU_MODEL=0) where the host and the Arm cores each got their own physical functions and MAC addresses as symmetric peers on the network, with no Arm-side ownership of host traffic. Deprecated in current BSP releases in favour of DPU mode and NIC mode.',
    exam: 'Recognise it as history: the modern choice is DPU (embedded) mode, optionally zero-trust, or NIC mode.' },

  { id: 'rshim', term: 'RShim', cat: 'Management & security',
    def: 'The BlueField management interface reachable over the host PCIe (or USB, or from the BlueField BMC). The rshim driver/service exposes /dev/rshim0/boot (push a BFB), /dev/rshim0/console (Arm serial console) and a tmfifo_net0 virtual Ethernet link (host 192.168.100.1 ↔ DPU 192.168.100.2 by default).',
    exam: 'rshim is how you install or recover a DPU OS when the Arm OS is broken or absent. Only one rshim owner (host or BMC) can be active at a time.' },

  { id: 'bfb', term: 'BFB image & bfb-install', cat: 'Cluster software',
    def: 'The BlueField Bootstream: a single bundle containing the Arm OS (Ubuntu by default), DOCA runtime and, in the "bundle" BFB, NIC/BMC/CEC firmware. Installed with bfb-install --bfb <file.bfb> --rshim rshim0 [--config bf.cfg] from the host, or pushed from the BlueField BMC via Redfish.',
    exam: 'Reinstalling the BFB is the standard fix for a corrupted DPU OS and the standard way to move to a new DOCA release.' },

  { id: 'bf-cfg', term: 'bf.cfg', cat: 'Cluster software',
    def: 'An optional configuration file passed alongside a BFB (bfb-install --config) that customises the installation: e.g. ubuntu_PASSWORD (a hashed password for the default "ubuntu" user), hostname, network and BMC settings, and whether to upgrade firmware.',
    exam: 'Set the Arm OS password non-interactively at install time by putting a hashed ubuntu_PASSWORD in bf.cfg — avoids the forced first-login password change on hundreds of DPUs.' },

  { id: 'bf-bmc', term: 'BlueField BMC', cat: 'Management & security',
    def: 'A dedicated OpenBMC controller on BlueField-3 DPUs (and later BlueField-2 variants) with its own Redfish/IPMI interface, reached through the card\'s 1 GbE OOB port. It can power-cycle the Arm complex, read sensors, update firmware and install a BFB over its own rshim.',
    exam: 'Lets you (re)image a DPU without touching the host OS — useful when the host is a bare-metal tenant or the host OS is not yet installed. Change its factory credentials like any BMC.' },

  { id: 'mst', term: 'MST (mst start / mst status)', cat: 'Monitoring & diagnostics',
    def: 'The Mellanox Software Tools service from MFT. mst start loads the access drivers and creates /dev/mst/* device nodes (BlueField-3 appears as mt41692_pciconf0, BlueField-2 as mt41686_pciconf0, ConnectX-7 as mt4129_pciconf0); mst status -v maps them to PCI addresses and netdevs.',
    exam: 'Run mst start before mlxconfig/flint/mlxlink if you want to address a device by /dev/mst path; mst status -v is the fastest inventory of NVIDIA NICs/DPUs in a host.' },

  { id: 'ovs-offload', term: 'OVS hardware offload (ASAP²)', cat: 'Fabric & networking',
    def: 'Accelerated Switching and Packet Processing: Open vSwitch runs on the BlueField Arm cores in DPU mode and pushes matching flows into the NIC eSwitch hardware, so forwarding, VXLAN encap/decap and ACLs run at line rate without host CPU. Enabled with ovs-vsctl set Open_vSwitch . other_config:hw-offload=true.',
    exam: 'The classic DPU use case: networking policy enforced on the card, out of reach of the host — isolation plus freed host CPU cycles.' },

  /* ---------------- MIG ---------------- */
  { id: 'gpu-instance', term: 'MIG GPU instance (GI)', cat: 'Compute & GPUs',
    def: 'The first level of MIG partitioning: a slice of the GPU with dedicated memory, L2 cache slices, memory controllers and a set of GPCs. Created from a profile (e.g. 3g.40gb) with nvidia-smi mig -cgi; listed with -lgi; destroyed with -dgi.',
    exam: 'The memory size and isolation boundary live at the GI level. A GI cannot be destroyed while compute instances still exist inside it.' },

  { id: 'compute-instance', term: 'MIG compute instance (CI)', cat: 'Compute & GPUs',
    def: 'The second level of MIG partitioning: a group of SMs inside a GPU instance that shares that GI\'s memory. Created with -cci (or automatically with -cgi … -C), listed with -lci, destroyed with -dci. The CI is what appears to CUDA as a MIG device.',
    exam: 'Order matters: create GI → CI; destroy CI → GI. Several CIs in one GI share memory, so they are isolated in compute but not in memory.' },

  { id: 'mig-profile', term: 'MIG profile (e.g. 1g.10gb)', cat: 'Compute & GPUs',
    def: 'Names the size of a GPU instance as <compute slices>g.<memory>gb. H100 80GB offers 1g.10gb (up to 7), 1g.20gb, 2g.20gb, 3g.40gb, 4g.40gb and 7g.80gb. Each has a numeric profile ID (e.g. 19 = 1g.10gb, 9 = 3g.40gb, 0 = 7g.80gb on H100) shown by nvidia-smi mig -lgip.',
    exam: 'Read the profile name literally: the first number is compute slices out of 7, the second is dedicated memory. Placement rules mean not every mix fits — check -lgipp.' },

  { id: 'mig-parted', term: 'nvidia-mig-parted / MIG Manager', cat: 'Cluster software',
    def: 'NVIDIA\'s declarative MIG partitioning tool: a YAML config names layouts (e.g. all-1g.10gb, all-balanced) and nvidia-mig-parted apply re-creates them, typically from a systemd service at boot. The GPU Operator\'s MIG Manager wraps it and applies the layout named in the node label nvidia.com/mig.config.',
    exam: 'GI/CI layouts do not survive a reboot on their own. The answer to "keep the MIG layout after reboot" or "change MIG layout on a Kubernetes node" is mig-parted / MIG Manager.' },

  { id: 'mig-strategy', term: 'MIG strategy (single vs. mixed)', cat: 'Cluster software',
    def: 'How the NVIDIA Kubernetes device plugin / GPU Operator advertises MIG devices. single: all GPUs on a node use the same profile and are advertised as nvidia.com/gpu. mixed: each profile is its own resource, e.g. nvidia.com/mig-1g.10gb and nvidia.com/mig-3g.40gb.',
    exam: 'Different profiles on the same node → mixed strategy, and pods must request the profile-specific resource name.' },

  { id: 'time-slicing', term: 'GPU time-slicing', cat: 'Compute & GPUs',
    def: 'Sharing a GPU by letting processes (or pods, via device-plugin replicas) take turns on the whole GPU. Oversubscribes a GPU cheaply but provides no memory or fault isolation and no performance guarantee.',
    exam: 'If the stem demands guaranteed QoS or fault isolation between tenants, time-slicing is the wrong answer; MIG is the right one.' },

  { id: 'vgpu', term: 'NVIDIA vGPU', cat: 'Compute & GPUs',
    def: 'Licensed virtualisation software that shares a GPU among virtual machines via a hypervisor, either time-sliced or MIG-backed (one MIG instance per VM on supported GPUs).',
    exam: 'VMs → vGPU (optionally MIG-backed). Bare-metal containers/processes needing hard isolation → MIG directly.' },
]
