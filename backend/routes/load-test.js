const express = require("express");
const router = express.Router();

// Endpoint to simulate a CPU-intensive task
// Generated from ChatGPT
router.get("/", (req, res) => {
  const startTime = Date.now();
  const duration = 2 * 60 * 1000; // 2 minutes in milliseconds

  // Function to perform a simple CPU-intensive calculation
  function cpuIntensiveTask() {
    let count = 0;
    while (Date.now() - startTime < duration) {
      // Simple CPU task: a loop that performs a calculation
      for (let i = 0; i < 1e6; i++) {
        count += Math.sqrt(i);
      }
    }
    return count; // Return a value to ensure loop doesn't get optimized away
  }

  // Execute the CPU-intensive task
  cpuIntensiveTask();

  // Send response after the task completes
  res.send("CPU load test completed. Server CPU was loaded for 2 minutes.");
});

module.exports = router;
