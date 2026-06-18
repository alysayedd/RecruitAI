# RecruitAI sample data

24 candidate CVs + 4 job descriptions for testing screening, ranking, fairness,
and explanation across roles, experience levels, demographics, and edge cases.

## Job descriptions

| File | Role | Level |
|---|---|---|
| `sample_job_description.txt` | Original generic JD | — |
| `jd_fullstack_senior.txt` | Senior Full-Stack Engineer | Senior |
| `jd_frontend_mid.txt` | Frontend Developer | Mid |
| `jd_data_scientist.txt` | Data Scientist (ML) | Mid |

## CVs — paired (identical content, different demographics)

Used to verify the pairwise fairness guarantee: identical CVs must score
identically regardless of name or university.

| Pair | Files | Differs only by |
|---|---|---|
| Frontend | `cv_1_ahmed_hassan_frontend.txt` vs `cv_2_john_smith_frontend.txt` | Name, city, university |
| Fullstack | `cv_3_fatima_ali_fullstack.txt` vs `cv_4_emily_chen_fullstack.txt` | Name, city, university |
| Fullstack senior | `cv_05_omar_khalil_fullstack.txt` vs `cv_06_oliver_kingsley_fullstack.txt` | Name, city, university |
| Data scientist | `cv_07_layla_mahmoud_data.txt` vs `cv_08_sarah_johnson_data.txt` | Name, city, schools |
| Frontend mid | `cv_16_maria_garcia_frontend.txt` vs `cv_25_amira_haddad_frontend.txt` | Name, city, university |

## CVs — realistic diverse pool

Different roles, levels, name origins, and universities. Useful for ranking
and bias-audit tests against the JDs.

| File | Role | Level | Origin / school |
|---|---|---|---|
| `cv_09_yusuf_ibrahim_backend.txt` | Backend | Senior | Saudi / King Saud |
| `cv_10_priya_sharma_fullstack.txt` | Full-stack | Mid | Indian / IIT Bombay |
| `cv_11_marco_rossi_devops.txt` | DevOps | Senior | Italian / Politecnico Milano |
| `cv_12_nour_elsayed_frontend.txt` | Frontend | Mid | Egyptian / GUC |
| `cv_13_david_brown_senior.txt` | Staff Eng. | Staff | American / MIT + CMU |
| `cv_14_aisha_okonkwo_ml.txt` | ML | Mid | Nigerian / UCT |
| `cv_15_chen_wei_backend.txt` | Backend | Senior | Singaporean / NUS |
| `cv_16_maria_garcia_frontend.txt` | Frontend | Mid | Spanish / UPM |
| `cv_17_kareem_abdelrahman_mobile.txt` | Mobile | Mid | Egyptian / Ain Shams |
| `cv_25_amira_haddad_frontend.txt` | Frontend | Mid | Lebanese / AUB |
| `cv_26_lukas_weber_devops.txt` | SRE | Senior | German / TU München |
| `cv_27_zainab_ahmed_ml.txt` | ML | Mid | Pakistani / LUMS |
| `cv_28_jose_martinez_fullstack.txt` | Full-stack | Senior | Argentine / UBA |

## CVs — edge cases

Stress-test the screener and explainer.

| File | What it tests |
|---|---|
| `cv_18_recent_grad_junior.txt` | Recent grad with only internships — should score low on a senior JD, fairly on a junior/mid JD |
| `cv_19_mismatched_skills.txt` | Embedded C/C++ engineer applying to web roles — should score very low |
| `cv_20_career_gap.txt` | 2-year career break — verify gap isn't unfairly penalised |
| `cv_21_overqualified.txt` | 18-year veteran Director rusty on coding — score should reflect rust, not overweigh tenure |
| `cv_22_sparse_minimal.txt` | Almost no detail — parser/score robustness |
| `cv_23_buzzword_heavy.txt` | Marketing speak with no substance — score should be low |
| `cv_24_career_changer.txt` | Pharmacist → bootcamp grad with healthtech relevance |

## Suggested test runs

1. **Fairness pairwise** — upload each paired set against the matching JD and confirm both CVs in a pair receive identical scores.
2. **Diverse pool ranking** — upload all 13 "realistic" CVs against `jd_fullstack_senior.txt`; check the ranking makes sense (Omar, Oliver, José, Yusuf, Chen should sit high; Marco, Lukas, Maria, Nour should sit lower; mobile/ML CVs should sit lower than full-stack).
3. **Edge-case behaviour** — upload all 7 edge cases against the same JD and read the per-candidate explanations.
4. **Bias audit visibility** — mix demographics roughly evenly and confirm the audit report flags no DIR violations after the normaliser runs.
