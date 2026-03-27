# Ubiquitous Language

## Evaluation lifecycle

| Term      | Definition                                                                 | Aliases to avoid          |
| --------- | -------------------------------------------------------------------------- | ------------------------- |
| **Run**   | A single execution of one or more evaluation files                         | Execution, batch          |
| **Suite** | A named collection of evals defined by a single `evalite()` call           | Test suite, test file     |
| **Eval**  | One test case execution: a single input processed by the task and scored   | Test, test case, result   |
| **Trial** | A repeated execution of the same eval for testing non-deterministic output | Iteration, repeat, sample |

## Functions

| Term       | Definition                                                            | Aliases to avoid                |
| ---------- | --------------------------------------------------------------------- | ------------------------------- |
| **Task**   | The function under evaluation that transforms an input into an output | Handler, processor, test target |
| **Scorer** | A function that assesses an eval's output and returns a score         | Evaluator, grader, judge        |
| **Score**  | A numerical assessment (0 to 1) of an eval produced by a scorer       | Rating, grade, metric           |

## Data

| Term         | Definition                                                            | Aliases to avoid          |
| ------------ | --------------------------------------------------------------------- | ------------------------- |
| **Input**    | The test data fed to a task                                           | Prompt, query, request    |
| **Output**   | The result produced by the task for a given input                     | Response, answer, result  |
| **Expected** | An optional reference value for scorers to compare against the output | Ground truth, gold, label |
| **Data**     | A list of input/expected pairs that define the test cases for a suite | Dataset, test data        |

## Observability

| Term      | Definition                                                              | Aliases to avoid |
| --------- | ----------------------------------------------------------------------- | ---------------- |
| **Trace** | A recorded LLM call (input, output, tokens, timing) made during an eval | Log, span, event |
| **Cache** | Stored LLM responses reused to avoid duplicate API calls across runs    | Memoization      |

## Experimentation

| Term              | Definition                                                               | Aliases to avoid    |
| ----------------- | ------------------------------------------------------------------------ | ------------------- |
| **Variant**       | A labeled variation of a suite for A/B testing different implementations | Experiment, version |
| **Variant group** | A grouping label that ties related variants together for comparison      | Experiment group    |

## Display

| Term                | Definition                                                          | Aliases to avoid |
| ------------------- | ------------------------------------------------------------------- | ---------------- |
| **Rendered column** | A custom display column computed from eval data and shown in the UI | Custom column    |

## Relationships

- A **Run** contains one or more **Suites**
- A **Suite** has exactly one **Task**, one or more **Scorers**, and a list of **Data**
- A **Suite** produces one **Eval** per data point per **Trial**
- An **Eval** has one **Input**, one **Output**, an optional **Expected**, multiple **Scores** (one per **Scorer**), and zero or more **Traces**
- A **Score** is always between 0 and 1 (null treated as 0)
- A **Variant** is a suite-level label; all **Evals** in that suite share the same variant
- A **Trace** records a single LLM call within an **Eval**

## Example dialogue

> **Dev:** "When I call `evalite()`, what actually gets created?"
>
> **Domain expert:** "You're defining a **Suite**. It has a **Task** (the function you're testing), **Scorers** (how you grade it), and **Data** (the input/expected pairs). When you run it, evalite creates one **Eval** per data point."
>
> **Dev:** "What if my **Task** calls an LLM three times for one input?"
>
> **Domain expert:** "Each LLM call becomes a separate **Trace** on that **Eval**. So you'd see three **Traces** with their own token counts and timing."
>
> **Dev:** "And if I set `trialCount: 3`?"
>
> **Domain expert:** "Then each data point produces three **Trials** -- three separate **Evals** with the same **Input** but potentially different **Outputs**, since the **Task** might behave non-deterministically."
>
> **Dev:** "How do **Variants** fit in?"
>
> **Domain expert:** "A **Variant** is a labeled copy of a **Suite** with a different **Task** implementation. You group them with a **Variant group** so the UI shows them side by side for comparison."

## Flagged ambiguities

- **"eval"** is used as both a noun (a single test case execution) and informally as a verb ("to eval"). In code and documentation, prefer **Eval** (capitalized) for the noun and "run evaluations" for the verb.
- **"score"** vs **"scorer"**: a **Scorer** is the function, a **Score** is the numeric result it produces. Avoid using "score" to refer to the function.
- **"expected"** is optional -- not all scorers need it (e.g., Faithfulness uses traces, not expected values). Don't assume every eval has an expected value.
- **"status"** applies at multiple levels (Eval, Suite) with the same values ("success" | "fail" | "running"). Always qualify which level: "eval status" or "suite status."
