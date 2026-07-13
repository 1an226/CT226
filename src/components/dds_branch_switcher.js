#!/usr/bin/env node
import authService from "@services/authService";
import ordersService from "@services/ordersService";

/**
 * DDS Branch Switcher for CT226 System
 * Runs as standalone Node.js script
 * Saves data to local files
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
require("dotenv").config(); // Load environment variables

// Validate required environment variables
if (!process.env.DDS_API_BASE_URL) {
  console.error("ERROR: DDS_API_BASE_URL environment variable is required");
  console.error("Please set it in your .env file or environment");
  process.exit(1);
}

const BASE_URL = process.env.DDS_API_BASE_URL;
const ALL_BRANCHES = [
  "Eldoret",
  "Bungoma",
  "Kisii",
  "Busia",
  "Kitalo",
  "Kakamega",
  "Meru 2",
  "Nyeri",
  "Karatina",
  "Naivasha",
  "Kisumu",
  "Thika",
  "Migori",
  "South C",
  "Machakos",
  "Donholm",
  "Kitui",
  "Ngumo",
  "Nakuru",
  "Pangani",
  "South B",
  "Kitengela",
  "Dandora 1",
  "Dandora 5",
  "Eastleigh",
  "Dandora 3",
  "Dandora 2",
  "Dandora 4",
  "Nyamasarua",
  "Isiolo Road",
  "Langata",
  "Kisumu 3",
  "Rupa",
  "Forest",
  "Crater",
  "Daraja",
  "Busia Annex",
  "Dandora 6",
];

class DDSBranchSwitcher {
  constructor(initialToken) {
    this.currentToken = initialToken;
    this.results = [];
    this.failedBranches = [];
    this.outputDir = path.join(__dirname, "dds_output");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-auth-token": this.currentToken,
      "x-requested-with": "XMLHttpRequest",
    };

    try {
      const config = {
        method: method,
        url: url,
        headers: headers,
        maxRedirects: 5,
        timeout: 30000,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);

      // Update token if new one is provided in headers
      const newToken = response.headers["x-auth-token"];
      if (newToken) {
        this.currentToken = newToken;
        console.log(`   Token updated`);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        console.log(
          `   API Error: ${error.response.status} - ${error.response.statusText}`
        );
        throw new Error(
          `API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      } else if (error.request) {
        console.log(`   Network Error: No response received`);
        throw new Error("Network Error: No response received");
      } else {
        console.log(`   Request Error: ${error.message}`);
        throw error;
      }
    }
  }

  async switchBranch(branchName) {
    return await this.makeRequest("POST", "/auth/switchbranch/", {
      branch: branchName,
      loginOnWeb: true,
    });
  }

async getBranchOrders() {    const currentBranch = authService.getCurrentBranch();    return await ordersService.getTodaysOrdersForBranch(currentBranch);  }

  async getBranchRoutes(branchName) {
    return await this.makeRequest(
      "GET",
      `/warehouse/listRoutesByBranch/${encodeURIComponent(branchName)}`
    );
  }

  async processBranch(branchName) {
    console.log(`\nProcessing: ${branchName}`);

    const result = {
      branch: branchName,
      timestamp: new Date().toISOString(),
      success: false,
      error: null,
      ordersCount: 0,
      routesCount: 0,
      sampleOrders: [],
      routes: [],
    };

    try {
      // Switch to branch
      console.log(`   Switching branch...`);
      const switchResult = await this.switchBranch(branchName);
      result.switchStatus = switchResult.message;
      console.log(`   ${switchResult.message}`);

      // Get orders for the branch
      console.log(`   Fetching orders...`);
      const ordersData = await this.getBranchOrders();
      const orders = await this.getBranchOrders();
      result.ordersCount = orders.length;
      result.sampleOrders = orders.slice(0, 5).map((order) => ({
        orderNo: order.orderNumber || order.orderNo,
        customerName: order.customerName,
        branch: order.branch,
        totalValue: order.totalValue || "N/A",
      }));
      console.log(`   Found ${result.ordersCount} orders`);
      console.log(`   Fetching routes...`);
      const routesData = await this.getBranchRoutes(branchName);
      result.routes = routesData.payload || routesData;
      result.routesCount = Array.isArray(result.routes)
        ? result.routes.length
        : 0;
      console.log(`   Found ${result.routesCount} routes`);

      result.success = true;
      this.results.push(result);

      // Display sample orders
      if (result.sampleOrders.length > 0) {
        console.log(`   Sample orders:`);
        result.sampleOrders.forEach((order, idx) => {
          console.log(
            `      ${idx + 1}. ${
              order.orderNo
            }: ${order.customerName?.substring(0, 30)}...`
          );
        });
      }
    } catch (error) {
      result.error = error.message;
      result.success = false;
      this.failedBranches.push({ branch: branchName, error: error.message });
      console.log(`   Failed: ${error.message}`);
    }

    return result;
  }

  async processBranches(branchList, delaySeconds = 3) {
    console.log(`\nStarting DDS Branch Switcher`);
    console.log(`Output directory: ${this.outputDir}`);
    console.log(`Delay between requests: ${delaySeconds} seconds`);
    console.log(`Total branches to process: ${branchList.length}\n`);

    const startTime = Date.now();

    for (let i = 0; i < branchList.length; i++) {
      const branch = branchList[i];
      const progress = `[${i + 1}/${branchList.length}]`;

      console.log(`${progress} Processing ${branch}`);
      await this.processBranch(branch);

      // Save progress every 5 branches
      if ((i + 1) % 5 === 0 || i === branchList.length - 1) {
        this.saveProgress();
        console.log(`   Progress saved (${i + 1}/${branchList.length})`);
      }

      // Delay before next request (except for last branch)
      if (i < branchList.length - 1) {
        console.log(`   Waiting ${delaySeconds} seconds...`);
        await this.sleep(delaySeconds * 1000);
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\nProcessing completed in ${duration} seconds`);
    console.log(`Processed: ${this.results.length} branches`);
    console.log(`Failed: ${this.failedBranches.length} branches`);

    // Generate final reports
    this.generateReports();

    return this.results;
  }

  saveProgress() {
    const progressFile = path.join(this.outputDir, "progress.json");
    const data = {
      timestamp: new Date().toISOString(),
      results: this.results,
      failedBranches: this.failedBranches,
      currentToken: this.currentToken.substring(0, 50) + "...",
    };

    fs.writeFileSync(progressFile, JSON.stringify(data, null, 2), "utf8");
  }

  generateReports() {
    // Save all results as JSON
    const resultsFile = path.join(
      this.outputDir,
      `dds_results_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(
      resultsFile,
      JSON.stringify(this.results, null, 2),
      "utf8"
    );
    console.log(`   Full results saved to: ${resultsFile}`);

    // Generate CSV report
    this.generateCSV();

    // Generate summary report
    this.generateSummary();
  }

  generateCSV() {
    const csvFile = path.join(this.outputDir, "dds_summary.csv");
    const csvHeader =
      "Branch,Success,OrdersCount,RoutesCount,Timestamp,Error\n";

    let csvContent = csvHeader;
    this.results.forEach((result) => {
      csvContent += `"${result.branch}",${result.success ? "YES" : "NO"},${
        result.ordersCount
      },${result.routesCount},"${result.timestamp}","${result.error || ""}"\n`;
    });

    fs.writeFileSync(csvFile, csvContent, "utf8");
    console.log(`   CSV summary saved to: ${csvFile}`);
  }

  generateSummary() {
    const summaryFile = path.join(this.outputDir, "summary_report.txt");

    const successful = this.results.filter((r) => r.success).length;
    const totalOrders = this.results.reduce((sum, r) => sum + r.ordersCount, 0);
    const totalRoutes = this.results.reduce((sum, r) => sum + r.routesCount, 0);

    const topBranches = this.results
      .filter((r) => r.success && r.ordersCount > 0)
      .sort((a, b) => b.ordersCount - a.ordersCount)
      .slice(0, 10);

    let summary = `DDS BRANCH SWITCHER REPORT\n`;
    summary += `Generated: ${new Date().toLocaleString()}\n`;
    summary += `========================================\n\n`;
    summary += `SUMMARY STATISTICS:\n`;
    summary += `────────────────────\n`;
    summary += `Total Branches Processed: ${this.results.length}\n`;
    summary += `Successful: ${successful}\n`;
    summary += `Failed: ${this.failedBranches.length}\n`;
    summary += `Total Orders Found: ${totalOrders}\n`;
    summary += `Total Routes Found: ${totalRoutes}\n\n`;

    summary += `TOP 10 BRANCHES BY ORDER COUNT:\n`;
    summary += `───────────────────────────────\n`;
    topBranches.forEach((branch, index) => {
      summary += `${index + 1}. ${branch.branch.padEnd(
        20
      )}: ${branch.ordersCount.toString().padStart(4)} orders\n`;
    });

    summary += `\nFAILED BRANCHES:\n`;
    summary += `────────────────\n`;
    if (this.failedBranches.length === 0) {
      summary += `None - All branches processed successfully!\n`;
    } else {
      this.failedBranches.forEach((failed) => {
        summary += `• ${failed.branch}: ${failed.error}\n`;
      });
    }

    summary += `\nOUTPUT FILES:\n`;
    summary += `─────────────\n`;
    summary += `• JSON Results: dds_results_*.json\n`;
    summary += `• CSV Summary: dds_summary.csv\n`;
    summary += `• Progress File: progress.json\n`;
    summary += `• This Report: summary_report.txt\n`;

    fs.writeFileSync(summaryFile, summary, "utf8");
    console.log(`   Summary report saved to: ${summaryFile}`);

    // Display summary in console
    console.log(`\n${summary}`);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Create interactive CLI
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Main execution
async function main() {
  console.clear();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     DDS BRANCH SWITCHER - CT226         ║");
  console.log("║     Standalone Node.js Script           ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const rl = createInterface();

  try {
    // Get authentication token
    const token = await new Promise((resolve) => {
      rl.question(
        "Enter your DDS auth token (starts with eyJhbGci...):\n> ",
        (answer) => {
          resolve(answer.trim());
        }
      );
    });

    if (!token || token.length < 100) {
      console.log("\nInvalid token! Please provide a valid JWT token.");
      rl.close();
      process.exit(1);
    }

    // Select branches
    console.log("\nBRANCH SELECTION:");
    console.log("───────────────────");
    console.log("1. Process ALL 38 branches");
    console.log("2. Process specific branches");
    console.log("3. Process test branches (Eldoret, Kitengela, Nakuru)");

    const choice = await new Promise((resolve) => {
      rl.question("\nSelect option (1-3): ", (answer) => {
        resolve(answer.trim());
      });
    });

    let selectedBranches = [];
    switch (choice) {
      case "1":
        selectedBranches = [...ALL_BRANCHES];
        console.log(`Selected ALL ${ALL_BRANCHES.length} branches`);
        break;
      case "2":
        console.log("\nAvailable branches:");
        ALL_BRANCHES.forEach((branch, idx) => {
          console.log(`${(idx + 1).toString().padStart(2)}. ${branch}`);
        });
        const branchInput = await new Promise((resolve) => {
          rl.question(
            "\nEnter branch numbers separated by commas (e.g., 1,5,12,38): ",
            (answer) => {
              resolve(answer.trim());
            }
          );
        });
        const branchNumbers = branchInput
          .split(",")
          .map((num) => parseInt(num.trim()) - 1);
        selectedBranches = branchNumbers
          .filter((idx) => idx >= 0 && idx < ALL_BRANCHES.length)
          .map((idx) => ALL_BRANCHES[idx]);
        console.log(`Selected ${selectedBranches.length} branches`);
        break;
      case "3":
        selectedBranches = ["Eldoret", "Kitengela", "Nakuru"];
        console.log("Selected test branches");
        break;
      default:
        console.log("Invalid choice. Using test branches.");
        selectedBranches = ["Eldoret", "Kitengela", "Nakuru"];
    }

    // Get delay between requests
    const delayInput = await new Promise((resolve) => {
      rl.question(
        "\nDelay between requests in seconds (recommended: 2-5): ",
        (answer) => {
          resolve(answer.trim());
        }
      );
    });
    const delay = parseInt(delayInput) || 3;

    rl.close();

    // Start processing
    const switcher = new DDSBranchSwitcher(token);
    await switcher.processBranches(selectedBranches, delay);

    console.log("\nScript execution completed!");
    console.log(`Check the 'dds_output' folder for results.`);
  } catch (error) {
    console.error(`\nScript failed: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  // Load .env file
  require("dotenv").config();
  
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { DDSBranchSwitcher, ALL_BRANCHES };