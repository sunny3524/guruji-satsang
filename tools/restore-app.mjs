import fs from "fs";
import readline from "readline";

async function restore() {
  const logPath = "/Users/anshulaggarwal/.gemini/antigravity/brain/d929de87-9bb5-4cbd-861c-d492d4ffed8e/.system_generated/logs/transcript.jsonl";
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Analyzing log file for App.jsx views and writes...");
  
  let stepCount = 0;
  for await (const line of rl) {
    stepCount++;
    const step = JSON.parse(line);
    
    // Check if App.jsx was read or written
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (call.name === "replace_file_content" || call.name === "write_to_file") {
          const args = typeof call.args === "string" ? JSON.parse(call.args) : call.args;
          if (args.TargetFile && args.TargetFile.includes("App.jsx")) {
            console.log(`Step ${step.step_index}: Tool ${call.name} modified App.jsx`);
          }
        }
        if (call.name === "view_file") {
          const args = typeof call.args === "string" ? JSON.parse(call.args) : call.args;
          if (args.AbsolutePath && args.AbsolutePath.includes("App.jsx")) {
            console.log(`Step ${step.step_index}: Tool ${call.name} read App.jsx lines ${args.StartLine}-${args.EndLine}`);
          }
        }
      }
    }
  }
  console.log(`Total steps analyzed: ${stepCount}`);
}

restore().catch(console.error);
