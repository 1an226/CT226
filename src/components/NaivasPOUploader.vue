<template>
  <div class="naivas-po-processor">
    <!-- Header -->
    <div class="header">
      <h2>📋 Naivas PO Processor</h2>
      <p>Upload Naivas Purchase Order to create orders automatically</p>
    </div>

    <!-- File Upload Area -->
    <div
      class="upload-area"
      :class="{ dragover: isDragging, 'has-file': !!uploadedFile }"
      ref="dropZone"
      @click="triggerFileInput"
    >
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        accept=".png,.jpg,.jpeg,.txt"
        style="display: none"
      />

      <div v-if="!uploadedFile" class="upload-prompt">
        <div class="upload-icon">📁</div>
        <h3>Drop Naivas PO Here</h3>
        <p>or click to browse</p>
        <p class="file-types">Supports: PNG, JPG, TXT files</p>
      </div>

      <div v-else class="file-info">
        <div class="file-icon">📄</div>
        <div class="file-details">
          <h3>{{ uploadedFile.name }}</h3>
          <p>{{ (uploadedFile.size / 1024).toFixed(1) }} KB</p>
          <button @click.stop="removeFile" class="remove-btn">Remove</button>
        </div>
      </div>
    </div>

    <!-- Process Button -->
    <div class="actions" v-if="uploadedFile && !processing">
      <button
        @click="processFile"
        class="process-btn"
        :disabled="!uploadedFile"
      >
        🚀 Process PO File
      </button>
    </div>

    <!-- Processing Indicator -->
    <div v-if="processing" class="processing">
      <div class="spinner"></div>
      <p>Processing {{ currentStep }}...</p>
    </div>

    <!-- Results -->
    <div v-if="poData" class="results">
      <!-- LPO Info -->
      <div class="lpo-info">
        <h3>✅ PO Parsed Successfully!</h3>
        <p>
          <strong>LPO Number:</strong> {{ poData.lpoNumber || "Not found" }}
        </p>
        <p><strong>Items Found:</strong> {{ poData.items.length }}</p>
        <p>
          <strong>Total Quantity:</strong> {{ poData.summary.totalQuantity }}
        </p>
      </div>

      <!-- Items Table -->
      <div v-if="poData.items.length > 0" class="items-table">
        <h4>📦 Items Detected</h4>
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in poData.items" :key="item.ocrItemCode">
              <td>{{ item.ocrItemCode }}</td>
              <td>{{ item.description }}</td>
              <td>{{ item.quantity }}</td>
              <td>KSh {{ item.unitPrice.toFixed(2) }}</td>
              <td>KSh {{ item.netAmount.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4"><strong>Total</strong></td>
              <td>
                <strong>KSh {{ poData.summary.totalAmount.toFixed(2) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Warnings/Errors -->
      <div v-if="poData.parsingWarnings.length > 0" class="warnings">
        <h4>⚠️ Notes</h4>
        <ul>
          <li v-for="(warning, index) in poData.parsingWarnings" :key="index">
            {{ warning }}
          </li>
        </ul>
      </div>

      <!-- Create Order Button -->
      <div class="order-actions">
        <button
          @click="createOrder"
          class="create-order-btn"
          :disabled="creatingOrder || poData.items.length === 0"
        >
          {{ creatingOrder ? "Creating..." : "📤 Create Order" }}
        </button>

        <button @click="reset" class="reset-btn">🔄 Process Another</button>
      </div>
    </div>

    <!-- Order Result -->
    <div v-if="orderResult" class="order-result">
      <div v-if="orderResult.success" class="success">
        <h3>🎉 Order Created Successfully!</h3>
        <p><strong>Order Number:</strong> {{ orderResult.orderNumber }}</p>
        <p><strong>Message:</strong> {{ orderResult.message }}</p>
        <p>
          <strong>Time:</strong>
          {{ new Date(orderResult.timestamp).toLocaleString() }}
        </p>
      </div>
      <div v-else class="error">
        <h3>❌ Order Failed</h3>
        <p><strong>Error:</strong> {{ orderResult.error }}</p>
        <button @click="orderResult = null" class="dismiss-btn">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import poService from "@/services/orderCreationService.js";

export default {
  name: "NaivasPOProcessor",
  data() {
    return {
      isDragging: false,
      uploadedFile: null,
      processing: false,
      creatingOrder: false,
      currentStep: "",
      poData: null,
      orderResult: null,
    };
  },
  mounted() {
    // Setup drag and drop
    poService.setupDragAndDrop(this.$refs.dropZone, this.handleDroppedFile);

    // Add visual feedback for drag
    const dropZone = this.$refs.dropZone;
    dropZone.addEventListener("dragover", () => {
      this.isDragging = true;
    });
    dropZone.addEventListener("dragleave", () => {
      this.isDragging = false;
    });
    dropZone.addEventListener("drop", () => {
      this.isDragging = false;
    });
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        this.uploadedFile = file;
      }
    },

    handleDroppedFile(file) {
      this.uploadedFile = file;
    },

    removeFile() {
      this.uploadedFile = null;
      this.$refs.fileInput.value = "";
    },

    async processFile() {
      if (!this.uploadedFile) return;

      this.processing = true;
      this.currentStep = "Extracting text...";

      try {
        // Parse the file
        this.currentStep = "Parsing PO data...";
        this.poData = await poService.parseFile(this.uploadedFile, "NAIVAS");

        console.log("✅ PO parsed:", this.poData);
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error("Processing failed:", error);
      } finally {
        this.processing = false;
        this.currentStep = "";
      }
    },

    async createOrder() {
      if (!this.poData || this.poData.items.length === 0) return;

      this.creatingOrder = true;

      try {
        this.orderResult = await poService.createOrder(this.poData);

        if (this.orderResult.success) {
          // Optional: Reset after successful order
          setTimeout(() => {
            this.reset();
          }, 3000);
        }
      } catch (error) {
        this.orderResult = {
          success: false,
          error: error.message,
        };
      } finally {
        this.creatingOrder = false;
      }
    },

    reset() {
      this.uploadedFile = null;
      this.poData = null;
      this.orderResult = null;
      this.$refs.fileInput.value = "";
    },
  },
};
</script>

<style scoped>
.naivas-po-processor {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
}

.upload-area {
  border: 3px dashed #bdc3c7;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 30px;
  background: #f8f9fa;
}

.upload-area:hover {
  border-color: #3498db;
  background: #e8f4fc;
}

.upload-area.dragover {
  border-color: #2ecc71;
  background: #e8f8f0;
  transform: scale(1.02);
}

.upload-area.has-file {
  border-color: #3498db;
  background: #f0f7ff;
}

.upload-prompt .upload-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.file-icon {
  font-size: 48px;
}

.file-details h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.remove-btn:hover {
  background: #c0392b;
}

.actions {
  text-align: center;
  margin-bottom: 30px;
}

.process-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.process-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
}

.process-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.processing {
  text-align: center;
  padding: 30px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.results {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.lpo-info {
  background: #e8f6f3;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
}

.lpo-info h3 {
  color: #27ae60;
  margin-top: 0;
}

.items-table {
  margin: 25px 0;
  overflow-x: auto;
}

.items-table h4 {
  color: #2c3e50;
  margin-bottom: 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th {
  background: #34495e;
  color: white;
  padding: 12px 15px;
  text-align: left;
}

td {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

tr:hover {
  background: #f5f7fa;
}

tfoot tr {
  background: #ecf0f1;
  font-weight: bold;
}

.warnings {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
}

.warnings h4 {
  color: #856404;
  margin-top: 0;
}

.order-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.create-order-btn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.create-order-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(46, 204, 113, 0.3);
}

.create-order-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
}

.reset-btn:hover {
  background: #7f8c8d;
}

.order-result {
  margin-top: 30px;
  padding: 20px;
  border-radius: 8px;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 20px;
  border-radius: 8px;
}

.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 20px;
  border-radius: 8px;
}

.dismiss-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  margin-top: 10px;
  cursor: pointer;
}

.file-types {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 10px;
}
</style>
