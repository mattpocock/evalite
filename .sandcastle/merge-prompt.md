# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `pnpm test` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# CLOSE ISSUES

For each branch that was merged, remove the issue's `Sandcastle` label, and comment on the issue saying what was done.

{{ISSUES}}

Once you've merged everything you can, output <promise>COMPLETE</promise>.
