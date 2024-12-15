<template>
    <div class="change-password-container">
      <h1>Change Password</h1>
      <form @submit.prevent="handleChangePassword" class="form">
        <input
          v-model="oldPassword"
          type="password"
          placeholder="Enter Old Password"
          required
        />
        <input
          v-model="newPassword"
          type="password"
          placeholder="Enter New Password"
          required
        />
        <button type="submit" class="submit-btn">Change Password</button>
      </form>
  
      <button @click="goBack" class="back-btn">Back</button>
  
      <!-- Error Modal -->
      <div v-if="showErrorModal" class="modal-overlay">
        <div class="modal pop-in">
          <p class="modal-message">{{ errorMessage }}</p>
          <button @click="closeErrorModal" class="modal-close-btn">Close</button>
        </div>
      </div>
  
      <!-- Success Modal -->
      <div v-if="showSuccessModal" class="modal-overlay">
        <div class="modal pop-in">
          <p class="modal-message">Password changed successfully!</p>
          <button @click="goBack" class="modal-close-btn">Go Back</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { initializeApp } from "firebase/app";
  import { getDatabase, ref as dbRef, get, update } from "firebase/database";
  
  const firebaseConfig = {
    apiKey: "AIzaSyCbhnQQNECCPY2Q083-2i6NZUmNDUqwJsM",
    authDomain: "raspberrypi4-smartlock.firebaseapp.com",
    databaseURL: "https://raspberrypi4-smartlock-default-rtdb.firebaseio.com",
    projectId: "raspberrypi4-smartlock",
    storageBucket: "raspberrypi4-smartlock.firebasestorage.app",
    messagingSenderId: "735609718532",
    appId: "1:735609718532:web:8a3bdb599b1a0976103251",
    measurementId: "G-V1BQH7XRC3",
  };
  
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  
  export default {
    name: "ChangePassword",
    data() {
      return {
        oldPassword: "",
        newPassword: "",
        showErrorModal: false,
        showSuccessModal: false,
        errorMessage: "",
      };
    },
    methods: {
      async fetchUserAccount() {
        const userAccountRef = dbRef(database, "user_account");
        const snapshot = await get(userAccountRef);
        if (snapshot.exists()) {
          return snapshot.val();
        } else {
          console.error("User account not found");
          return null;
        }
      },
      async handleChangePassword() {
        const userAccount = await this.fetchUserAccount();
        if (!userAccount) {
          this.errorMessage = "Error fetching account data.";
          this.showErrorModal = true;
          return;
        }
  
        if (this.oldPassword !== userAccount.password) {
          this.errorMessage = "Old password is incorrect.";
          this.showErrorModal = true;
          return;
        }
  
        try {
          const userAccountRef = dbRef(database, "user_account");
          await update(userAccountRef, { password: this.newPassword });
          this.showSuccessModal = true;
        } catch (error) {
          console.error("Error updating password:", error);
          this.errorMessage = "Failed to update the password.";
          this.showErrorModal = true;
        }
      },
      closeErrorModal() {
        this.showErrorModal = false;
      },
      goBack() {
        this.$router.push({ name: "Home" }); // Adjust route name as needed
      },
    },
  };
  </script>
  
  <style scoped>
  .change-password-container {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    text-align: center;
  }
  
  .form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  input {
    padding: 10px;
    font-size: 16px;
  }
  
  button {
    padding: 10px;
    font-size: 16px;
    cursor: pointer;
  }
  
  .submit-btn {
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
  }
  
  .back-btn {
    background-color: #6c757d;
    color: #fff;
    border: none;
    border-radius: 5px;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal {
    background: #fff;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  }
  
  .modal-close-btn {
    margin-top: 10px;
    padding: 10px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  </style>
  