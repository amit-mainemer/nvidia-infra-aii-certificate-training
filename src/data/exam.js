export const exam = {
  code: 'NCP-AII',
  name: 'NVIDIA-Certified Professional: AI Infrastructure',
  level: 'Professional (intermediate)',
  duration: '120 minutes',
  questions: '70–75',
  price: '$400 USD',
  passing: 'Not published (aim for 75%+ here)',
  validity: '2 years',
  delivery: 'Online, remotely proctored (Certiverse)',
  language: 'English',
  prereq: '2–3 years of operational data-center experience with NVIDIA hardware',
  officialUrl: 'https://www.nvidia.com/en-eu/learn/certification/ai-infrastructure-professional/',
  studyGuideUrl: 'https://dam-cdn.nvd.orangelogic.com/AssetLink/8gauup66xn2gv80pu4m166li0bhyytk4.pdf',
  registerUrl: 'https://www.certiverse.com/#/checkout/nvidia/store-exam/NCP-AII',
}

/* Colours are assigned per-domain and reused across the whole app so that a
   domain is always recognisable by the same hue. Weights and objective numbers
   follow the official NCP-AII study guide (SEP25). */
export const blueprint = [
  { id: 'bringup',      n: 1, name: 'System and Server Bring-up',                 weight: 31, color: '#22c7e8' },
  { id: 'physical',     n: 2, name: 'Physical Layer Management',                  weight: 5,  color: '#a78bfa' },
  { id: 'controlplane', n: 3, name: 'Control Plane Installation and Configuration', weight: 19, color: '#ff9f5a' },
  { id: 'verification', n: 4, name: 'Cluster Test and Verification',              weight: 33, color: '#6d9dff' },
  { id: 'troubleshoot', n: 5, name: 'Troubleshoot and Optimize',                  weight: 12, color: '#f472b6' },
]

export const domainById = Object.fromEntries(blueprint.map((d) => [d.id, d]))

/** Scale factor for weight bars so the largest domain (33%) fills ~95% of the track. */
export const WEIGHT_SCALE = 95 / Math.max(...blueprint.map((d) => d.weight))
