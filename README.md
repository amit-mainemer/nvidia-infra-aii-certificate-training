# NCP-AII Academy

A free, self-paced learning platform for the **NVIDIA-Certified Professional: AI Infrastructure (NCP-AII)** exam.

**Live site:** https://amit-mainemer.github.io/nvidia-infra-aii-certificate-training/

Built as a single-page React app with no backend — all progress lives in your browser's local storage.
Sister project: [NCP-AAI Academy](https://amit-mainemer.github.io/nvidia-aai-certificate-training/) (Agentic AI).

---

## What's inside

| | |
|---|---|
| **5 modules, 20 lessons** | One module per official exam domain, every lesson mapped to the study guide's numbered objectives (1.1–5.5) |
| **Module intro videos** | A narrated ~2-minute intro for every module, with subtitles |
| **Lesson checks** | Five questions at the end of every lesson; passing marks the lesson complete |
| **Module quizzes** | Exam-style questions per module with explanations and distractor analysis |
| **70-question mock exam** | A separate, blueprint-weighted bank on a 120-minute clock, scored per domain |
| **Glossary** | Every technical term is hoverable inline, with a definition *and* how it's tested |
| **Resources** | The official study guide's suggested reading, grouped by domain, plus study plans |

### Exam facts (verify on the [official page](https://www.nvidia.com/en-eu/learn/certification/ai-infrastructure-professional/))

- **Code:** NCP-AII · **Level:** Professional (intermediate)
- **Format:** 70–75 questions, 120 minutes, online remotely proctored (Certiverse)
- **Price:** $400 · **Validity:** 2 years
- **Background:** 2–3 years of data-center operations with NVIDIA hardware

### Blueprint coverage ([study guide PDF](https://dam-cdn.nvd.orangelogic.com/AssetLink/8gauup66xn2gv80pu4m166li0bhyytk4.pdf))

| # | Domain | Weight | Objectives | Module |
|---|---|---|---|---|
| 1 | System and Server Bring-up | 31% | 1.1–1.11 | `m01-bringup` |
| 2 | Physical Layer Management | 5% | 2.1–2.2 | `m02-physical` |
| 3 | Control Plane Installation and Configuration | 19% | 3.1–3.7 | `m03-controlplane` |
| 4 | Cluster Test and Verification | 33% | 4.1–4.14 | `m04-verification` |
| 5 | Troubleshoot and Optimize | 12% | 5.1–5.5 | `m05-troubleshoot` |

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173/nvidia-infra-aii-certificate-training/
npm run build    # production build into dist/
npm run preview  # serve the production build
node tools/check-content.mjs   # validate glossary links, answers and question counts
```

Requires Node 18+. Dependencies: React 18, React Router, Vite.

## Project layout

```
src/data/exam.js            exam facts + blueprint (domain ids, weights, colours)
src/data/objectives.js      official objectives and the lesson that covers each
src/data/modules/mNN-*.js   lessons (content blocks) + module quiz
src/data/checks/mNN-*.js    end-of-lesson checks
src/data/examBank.js        70-question mock exam bank
src/data/glossary/*.js      glossary (core + per module)
src/data/resources.js       training, reading list, study plans, exam-day tips
tools/CURRICULUM.md         authoring spec
tools/video/                module intro video pipeline (see tools/video/README.md)
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages.
In the repository settings, set **Pages → Source** to **GitHub Actions**. The Vite `base` in `vite.config.js`
must match the repository name.

---

An independent, community-built study companion. Not affiliated with or endorsed by NVIDIA.
