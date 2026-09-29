/**
 * Module 3 glossary — Control Plane Installation and Configuration.
 * Shared terms (bcm, slurm, enroot, pyxis, ngc, container-toolkit, doca, dgx-os,
 * fabric-manager, persistence-mode, nvidia-smi …) live in core.js — link, don't redefine.
 */
export default [
  /* ---------------- Cluster software: BCM ---------------- */
  { id: 'cmsh', term: 'cmsh (cluster management shell)', cat: 'Cluster software',
    def: 'The BCM command-line shell. It is organised into modes (device, category, softwareimage, network, partition, wlm, main …); inside a mode you use/list/show/set objects and then commit. It also runs non-interactively: cmsh -c "device; list".',
    exam: 'Changes made with set are staged until commit. Know the mode for each object: nodes → device, groups of nodes → category, images → softwareimage, subnets → network.' },

  { id: 'base-view', term: 'Base View', cat: 'Cluster software',
    def: 'The browser-based GUI for BCM (formerly Bright View), served by the head node\'s CMDaemon over HTTPS. It exposes the same objects as cmsh: devices, categories, software images, networks, monitoring and workload managers.',
    exam: 'Base View and cmsh are two front-ends to the same CMDaemon; anything configurable in one is configurable in the other.' },

  { id: 'head-node', term: 'Head node', cat: 'Cluster software',
    def: 'The BCM management server. It runs CMDaemon, the cluster database, DHCP/TFTP/PXE services for provisioning, holds the software images under /cm/images and usually hosts workload-manager controllers such as slurmctld.',
    exam: 'Installed first, from the BCM ISO. Everything else is provisioned from it, which is why a production cluster adds a second (passive) head node for HA.' },

  { id: 'software-image', term: 'Software image', cat: 'Cluster software',
    def: 'A complete root file system stored on the head node (e.g. /cm/images/default-image) that BCM copies to nodes during provisioning. Packages, drivers and config are installed into the image, not into individual nodes.',
    exam: 'Install the GPU driver, DOCA-Host or Enroot into the image (chroot), then push it with imageupdate or a reboot. Changes made only on a running node are overwritten at the next full sync.' },

  { id: 'bcm-category', term: 'Category (BCM)', cat: 'Cluster software',
    def: 'A BCM group of nodes that share configuration: software image, roles (e.g. slurmclient), filesystem mounts, services, kernel parameters and install mode. Nodes inherit from their category unless a node-level value overrides it.',
    exam: 'Put all DGX nodes in one category (e.g. dgx-h100) pointing at one image; set per-node settings (IP addresses, interfaces) at device level.' },

  { id: 'node-installer', term: 'Node installer & PXE provisioning', cat: 'Cluster software',
    def: 'Compute nodes PXE-boot from the head node over internalnet, load the BCM node-installer, get identified (by MAC or switch port), then receive their software image via rsync according to the install mode (AUTO, FULL, MAIN or NOSYNC) before booting into it.',
    exam: 'A node that never reaches the node-installer usually has PXE/boot order or the provisioning interface wrong; a node that installs but has stale files may be in NOSYNC or needs a FULL install.' },

  { id: 'imageupdate', term: 'imageupdate', cat: 'Cluster software',
    def: 'A cmsh device-mode command that synchronises a running node with its software image without a reboot (imageupdate -n node001 -w; add a dry run first to preview changes).',
    exam: 'Good for config and package changes; a new kernel module (driver) generally still needs the modules unloaded or the node rebooted to take effect.' },

  { id: 'bcm-networks', term: 'BCM networks (internalnet, externalnet, ipminet)', cat: 'Fabric & networking',
    def: 'Network objects defined at install: internalnet is the private provisioning/management network (default 10.141.0.0/16), externalnet connects the head node to the site network, ipminet carries BMC/IPMI traffic (default 10.148.0.0/16). Further networks (e.g. ibnet) can be added.',
    exam: 'Nodes provision over internalnet; BCM controls power through ipminet; users reach the cluster through externalnet on the head node.' },

  { id: 'bcm-ha', term: 'BCM head-node high availability', cat: 'Cluster software',
    def: 'An active/passive pair of head nodes configured with cmha-setup. The secondary is cloned from the primary (cm-clone-install --failover), the cluster database is replicated, a shared virtual IP moves with the active node, and /cm/shared and /home sit on shared storage.',
    exam: 'Verify with cmha status; force a switch with cmha makeactive on the passive node. Failover is decided by heartbeat plus quorum, and the failed node is powered off (fenced) before takeover.' },

  { id: 'cm-wlm-setup', term: 'cm-wlm-setup', cat: 'Cluster software',
    def: 'The BCM wizard (interactive or scripted) that deploys a workload manager such as Slurm: picks the server/controller node(s), the client categories or nodes, GPU GRES settings and optional Pyxis/Enroot integration.',
    exam: 'The supported way to put Slurm on a BCM cluster — do not hand-install slurm.conf on nodes; BCM manages it.' },

  { id: 'gres', term: 'GRES & gres.conf', cat: 'Cluster software',
    def: 'Slurm Generic RESources. GPUs are declared with GresTypes=gpu in slurm.conf and Gres=gpu:8 on the node line; gres.conf maps them to devices, most simply with AutoDetect=nvml so slurmd discovers GPUs through NVML.',
    exam: 'Jobs cannot request GPUs (--gpus / --gres=gpu:N) until GRES is configured; a mismatch between declared and detected GPUs drains the node.' },

  { id: 'run-ai', term: 'NVIDIA Run:ai', cat: 'Cluster software',
    def: 'A Kubernetes-based AI workload orchestration and GPU-scheduling platform (quotas, fair share, fractional GPUs, projects). On BCM it is deployed on top of a BCM-installed Kubernetes cluster.',
    exam: 'Listed in the NCP-AII job responsibilities. Kubernetes + Run:ai is the alternative to Slurm + Enroot/Pyxis as the cluster\'s workload layer.' },

  /* ---------------- Compute & GPUs: drivers ---------------- */
  { id: 'open-kernel-modules', term: 'NVIDIA open GPU kernel modules', cat: 'Compute & GPUs',
    def: 'The open-source flavour of the NVIDIA kernel driver (packages such as nvidia-open or nvidia-driver-XXX-server-open). Recommended for Turing and newer and required for Grace Hopper and Blackwell GPUs; the user-space libraries are the same.',
    exam: 'For H100/H200/B200 pick the open-module package; installing the proprietary flavour on a GPU that requires open modules leaves the GPU without a working driver.' },

  { id: 'dkms', term: 'DKMS', cat: 'Compute & GPUs',
    def: 'Dynamic Kernel Module Support: rebuilds out-of-tree kernel modules (the NVIDIA driver, some DOCA modules) automatically for each installed kernel, using the matching kernel headers.',
    exam: '"Driver stopped working after a kernel update" → the DKMS build failed or headers were missing (dkms status shows it). Pinning the kernel or using precompiled/signed modules avoids it.' },

  { id: 'nouveau', term: 'nouveau', cat: 'Compute & GPUs',
    def: 'The open-source community driver for NVIDIA GPUs included in Linux distributions. It must be blacklisted (blacklist nouveau, options nouveau modeset=0) and the initramfs rebuilt before the NVIDIA driver can bind to the GPUs.',
    exam: 'A driver install that fails with "nouveau is in use" or modules that will not load → blacklist nouveau, update-initramfs -u (or dracut -f) and reboot.' },

  { id: 'doca-host', term: 'DOCA-Host (doca-all / doca-ofed)', cat: 'Fabric & networking',
    def: 'The host-side NVIDIA networking stack for ConnectX and BlueField that replaces MLNX_OFED. Installed from a local repo package with profiles such as doca-all (everything) or doca-ofed (the OFED-equivalent drivers and tools).',
    exam: 'After install restart the stack with /etc/init.d/openibd restart; verify with ofed_info -s, ibstat and ibv_devinfo.' },

  { id: 'nvidia-peermem', term: 'nvidia-peermem', cat: 'Fabric & networking',
    def: 'The kernel module, shipped with the GPU driver, that lets InfiniBand/RoCE HCAs access GPU memory directly — the enabler for GPUDirect RDMA. Loaded with modprobe nvidia-peermem.',
    exam: 'It builds against the installed IB stack: install DOCA-Host first, then the GPU driver (or reinstall the driver after changing the network stack). Multi-node NCCL falling back to slower paths is a classic sign it is not loaded.' },

  /* ---------------- Cluster software: containers ---------------- */
  { id: 'nvidia-ctk', term: 'nvidia-ctk', cat: 'Cluster software',
    def: 'The NVIDIA Container Toolkit CLI. nvidia-ctk runtime configure --runtime=docker (or containerd / crio) registers the nvidia runtime in the engine config; nvidia-ctk cdi generate writes a CDI spec describing the GPUs.',
    exam: 'Configure, then restart the container engine (systemctl restart docker) — forgetting the restart is the classic "could not select device driver" cause.' },

  { id: 'cdi', term: 'CDI (Container Device Interface)', cat: 'Cluster software',
    def: 'A CNCF specification describing devices for container runtimes in a YAML/JSON file (e.g. /etc/cdi/nvidia.yaml). GPUs are then requested by name, such as --device nvidia.com/gpu=all in Podman.',
    exam: 'Generate with nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml and list with nvidia-ctk cdi list; regenerate after a driver change or GPU swap.' },

  { id: 'ngc-api-key', term: 'NGC API key & $oauthtoken', cat: 'Management & security',
    def: 'The credential generated in the NGC web UI (Setup → API key) used by the NGC CLI (ngc config set) and by container engines logging in to nvcr.io, where the username is the literal string $oauthtoken and the password is the key.',
    exam: 'Username is literally $oauthtoken — not your e-mail. Quote it (\'$oauthtoken\') so the shell does not expand it to an empty variable.' },
]
