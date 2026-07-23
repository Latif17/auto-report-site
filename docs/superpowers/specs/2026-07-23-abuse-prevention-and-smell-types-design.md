# Abuse Prevention & Smell Types Update

## Overview
This feature resolves two problems:
1. Enhances spam prevention by enforcing a 2-hour window during which only one actionable smell type can be reported.
2. Updates the reportable smell options to align with reality, including a new "Can't tell" option for users who are unsure, keeping un-actionable reports out of the EPA submission pipeline.

## 1. Smell Types & UI Updates
The UI dropdown will be restricted to four specific options, with guidance provided below the dropdown.

* **Can't tell** -> Warns the user that their report will only be logged internally and will NOT be submitted to the EPA.
* **Sewage** -> Maps to `Sewage` (Location: Multiple (Beckton, Riverside, Crossness))
* **Plastic** -> Maps to `Plastic` (Location: Veolia Dagenham (Plastics))
* **Rotting Rubbish** -> Maps to `Rubbish or refuse` (Location: Multiple (ReFood, East London Bio Gas))

## 2. Backend Processing & Internal Logging
* Actionable smells (`Sewage`, `Plastic`, `Rubbish or refuse`) will be saved to the database with a status of `pending`.
* "Can't tell" will be mapped to a `smell_type` of `Unknown` and `business_location` of `Unknown`, and will be saved with a `status` of `internal_only`. This prevents it from being submitted to the EPA.

## 3. The 2-Hour Anti-Spam Window
The deduplication check in `server.js` will be modified:
* The timeframe will be reduced from 3 hours to 2 hours (+/- 2 hours).
* The query will search for ANY incident in that window where `status != 'internal_only'` (i.e. actionable incidents).
* **If an actionable incident exists in the 2-hour window:**
    * If the user submits the *same* smell type, they are joined to the active incident.
    * If the user submits a *different* smell type (or "Can't tell"), the API rejects the submission with a 400 error: "A report for [Existing Smell] was already logged recently. It is unlikely the smell changed so quickly. To prevent spam, please join the active report instead or wait until the 2-hour restriction is over."
* **If NO actionable incident exists:**
    * The report is created normally (as `pending` for actionable smells, or `internal_only` for "Can't tell"). "Can't tell" incidents do not block subsequent actionable reports.
