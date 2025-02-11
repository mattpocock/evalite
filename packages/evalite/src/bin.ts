#!/usr/bin/env node

import { run } from "@stricli/core";
import { program } from "./command.js";

run(program, process.argv.slice(2), { process });
