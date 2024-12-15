<template>
  <div id="app">
    <nav>Smart Lock Dashboard</nav>

    <div v-if="!isAuthenticated" class="login-container">
      <h1>Login</h1>
      <form @submit.prevent="login" class="form">
        <input v-model="username" type="text" placeholder="Enter Username" required />
        <input v-model="password" type="password" placeholder="Enter Password" required />
        <button type="submit" class="login-btn">Login</button>
      </form>
    </div>

    <div v-else class="content-container">
      <h1>Administration Panel</h1>
      
      <!-- Button to control the door status -->
      <button 
        @click="toggleDoorStatus" 
        :class="doorStatus ? 'unlock-door' : 'lock-door'" 
        class="door-status-btn" 
        :disabled="isButtonDisabled">
        {{ doorStatus ? 'Door Unlocked' : 'Unlock Door' }}
      </button>

      <!-- Logout Button -->
      <button @click="logout" class="logout-btn">Logout</button>

      <div v-if="loading" class="loading">Loading...</div>

      <div v-else>
        <table v-if="paginatedFiles.length > 0" class="data-table">
          <thead>
            <tr>
              <th>UserID</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, index) in paginatedFiles" :key="index">
              <td>{{ file.filename }}</td>
              <td>{{ file.timestamp }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="no-data">No data available</div>

        <!-- Pagination Controls -->
        <div class="pagination">
          <button :disabled="!hasPreviousPage" @click="previousPage" class="pagination-btn">Back</button>
          <button :disabled="!hasNextPage" @click="nextPage" class="pagination-btn">Next</button>
        </div>

        <!-- Change Password Section -->
        <div class="change-password-container">
          <h2>Change Password</h2>
          <form @submit.prevent="changePassword" class="form">
            <input v-model="oldPassword" type="password" placeholder="Enter Current Password" required />
            <input v-model="newPassword" type="password" placeholder="Enter New Password" required />
            <button type="submit" class="change-password-btn">Change Password</button>
          </form>
          <p v-if="passwordError" class="error-message">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="success-message">{{ passwordSuccess }}</p>
        </div>
      </div>
    </div>

    <!-- Modal for failed login -->
    <div v-if="showErrorModal" class="modal-overlay">
      <div class="modal pop-in">
        <p class="modal-message">Invalid username or password.</p>
        <button @click="showErrorModal = false" class="modal-close-btn">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { initializeApp } from "firebase/app";
import { getDatabase, ref as dbRef, query, get, set, orderByKey, limitToFirst, startAfter } from "firebase/database";
import { ref, onMounted, computed } from "vue";

const firebaseConfig = {
  apiKey: "AIzaSyCbhnQQNECCPY2Q083-2i6NZUmNDUqwJsM",
  authDomain: "raspberrypi4-smartlock.firebaseapp.com",
  databaseURL: "https://raspberrypi4-smartlock-default-rtdb.firebaseio.com",
  projectId: "raspberrypi4-smartlock",
  storageBucket: "raspberrypi4-smartlock.firebasestorage.app",
  messagingSenderId: "735609718532",
  appId: "1:735609718532:web:8a3bdb599b1a0976103251",
  measurementId: "G-V1BQH7XRC3"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default {
  name: 'App',
  setup() {
    const isAuthenticated = ref(false);
    const username = ref('');
    const password = ref('');
    const oldPassword = ref('');
    const newPassword = ref('');
    const userFiles = ref([]);
    const paginatedFiles = ref([]);
    const loading = ref(true);
    const showErrorModal = ref(false);
    const lastFetchedKey = ref(null);
    const previousKeys = ref([]);
    const hasNextPage = ref(false);
    const passwordError = ref('');
    const passwordSuccess = ref('');
    const hasPreviousPage = computed(() => previousKeys.value.length > 0);
    const doorStatus = ref(false); // To track door status (locked or unlocked)
    const isButtonDisabled = ref(false); // To track button disable state

    const fetchUserAccount = async () => {
      const userAccountRef = dbRef(database, 'user_account');
      const snapshot = await get(userAccountRef);
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        console.error('User account not found');
        return null;
      }
    };

    const fetchPaginatedFiles = async (lastKey = null, limit = 20) => {
      const baseQuery = query(dbRef(database, 'user_files'), orderByKey(), limitToFirst(limit + 1));
      const finalQuery = lastKey ? query(baseQuery, startAfter(lastKey)) : baseQuery;

      try {
        const snapshot = await get(finalQuery);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const files = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
          }));
          hasNextPage.value = files.length > limit;
          return files.slice(0, limit);
        }
        return [];
      } catch (error) {
        console.error("Error fetching paginated files:", error);
        return [];
      }
    };

    const loadInitialFiles = async () => {
      loading.value = true;
      const data = await fetchPaginatedFiles();
      userFiles.value = data;
      paginatedFiles.value = data;
      lastFetchedKey.value = data.length ? data[data.length - 1].id : null;
      loading.value = false;
    };

    const nextPage = async () => {
      if (hasNextPage.value) {
        previousKeys.value.push(lastFetchedKey.value);
        const data = await fetchPaginatedFiles(lastFetchedKey.value);
        paginatedFiles.value = data;
        lastFetchedKey.value = data.length ? data[data.length - 1].id : null;
      }
    };

    const previousPage = async () => {
      if (hasPreviousPage.value) {
        const previousKey = previousKeys.value.pop();
        const data = await fetchPaginatedFiles(previousKey);
        paginatedFiles.value = data;
        lastFetchedKey.value = previousKey;
      }
    };

    const login = async () => {
      const userAccount = await fetchUserAccount();
      if (userAccount) {
        if (username.value === userAccount.username && password.value === userAccount.password) {
          isAuthenticated.value = true;
          localStorage.setItem('isAuthenticated', 'true');
          await loadInitialFiles();
        } else {
          showErrorModal.value = true;
        }
      }
    };

    const logout = () => {
      isAuthenticated.value = false;
      username.value = '';
      password.value = '';
      localStorage.removeItem('isAuthenticated');
    };

    const changePassword = async () => {
      passwordError.value = '';
      passwordSuccess.value = '';
      const userAccount = await fetchUserAccount();
      if (userAccount) {
        if (oldPassword.value === userAccount.password) {
          const userAccountRef = dbRef(database, 'user_account');
          await set(userAccountRef, {
            username: userAccount.username,
            password: newPassword.value
          });
          passwordSuccess.value = 'Password successfully updated.';
          oldPassword.value = '';
          newPassword.value = '';
        } else {
          passwordError.value = 'Current password is incorrect.';
        }
      }
    };

    const toggleDoorStatus = async () => {
      // Disable the button for 5 seconds
      isButtonDisabled.value = true;

      // Set door status to true when button is clicked
      doorStatus.value = true;
      console.log("Door status: Unlocked");
      
      // Update door status in Firebase immediately
      const doorStatusRef = dbRef(database, "door_status");
      await set(doorStatusRef, doorStatus.value);

      // After 5 seconds, revert door status back to false and enable the button again
      setTimeout(async () => {
        doorStatus.value = false;
        console.log("Door status: Locked");

        // Update the door status in Firebase after 5 seconds
        await set(doorStatusRef, doorStatus.value);
        
        // Enable the button again
        isButtonDisabled.value = false;
      }, 5000); // 5000 ms = 5 seconds
    };

    onMounted(() => {
      if (localStorage.getItem('isAuthenticated') === 'true') {
        isAuthenticated.value = true;
        loadInitialFiles();
      }
    });

    return {
      isAuthenticated,
      username,
      password,
      oldPassword,
      newPassword,
      paginatedFiles,
      loading,
      login,
      logout,
      changePassword,
      showErrorModal,
      doorStatus,
      toggleDoorStatus,
      isButtonDisabled,
      hasNextPage,
      hasPreviousPage,
      nextPage,
      previousPage,
      passwordError,
      passwordSuccess
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

* {
  margin: 20;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Poppins', sans-serif;
  background-color: #f0f4f8;
  display: flex;
  justify-content: center; /* Horizontally centers the children */
  align-items: center; /* Vertically centers the children */
  height: 100vh; /* Full height of the viewport */
  margin: 0; /* Remove any default margin */
}

#app {
  display: flex;
  flex-direction: column;
  justify-content: center; /* Ensure that child elements like the login form are centered vertically */
  align-items: center; /* Ensure horizontal centering */
  width: 100%; /* Full width */
  height: 100%; /* Full height */
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  padding: 30px;
  margin-top: 20vh;
  animation: popIn 0.6s ease-out;
}

nav {
  width: 100%;
  background-color: #4CAF50;
  padding: 10px; /* Reduced padding for less space */
  color: white;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: padding 0.3s ease-out; /* Smooth padding adjustment */
}

h1 {
  font-size: 1.8rem; /* Adjusted size for balance */
  color: #4CAF50;
  margin-bottom: 20px;
  margin-top: 60px; /* Reduced for compact header */
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  padding: 30px;
  margin-top: 20px;
  animation: popIn 0.6s ease-out;
}

@keyframes popIn {
  0% {
    transform: scale(0.9);
    opacity: 0;
    animation-timing-function: ease-out;
  }
  100% {
    transform: scale(1);
    opacity: 1;
    animation-timing-function: ease-in;
  }
}

.login-container h1 {
  font-size: 2rem;
  color: #4CAF50;
  margin-bottom: 20px;
}

.login-container input {
  margin: 12px 0;
  padding: 12px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}.door-status-btn {
  background-color: #2268ff;
  padding: 12px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width:30%;
}
.door-status-btn:hover {
  background-color: #45a049;
  transform: scale(1.05);
}

.door-status-btn:active {
  background-color: #388e3c; /* Darker green when button is pressed */
}
.login-container button {
  padding: 12px;
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.login-container button:hover {
  background-color: #45a049;
  transform: scale(1.05);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}

.modal-message {
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.modal-close-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.logout-btn {
  background-color: #FF5722;
  padding: 12px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top:10px;
  width:30%;
}

.logout-btn:hover {
  background-color: #e64a19;
}

.content-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1000px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: white; /* Makes the table stand out */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* Adds a slight shadow for depth */
  border-radius: 8px; /* Smoothens table edges */
  overflow: hidden; /* Prevents overflow on border-radius */
}

.data-table th, .data-table td {
  padding: 14px 20px; /* Adds more padding for readability */
  text-align: left;
  border-bottom: 1px solid #ddd; /* Soft border color */
}

.data-table th {
  background-color: #4CAF50; /* Adds a distinct header color */
  color: white; /* Ensures text contrast */
  font-weight: bold; /* Highlights the header text */
  text-transform: uppercase; /* Enhances header appearance */
}

.data-table tbody tr:nth-child(odd) {
  background-color: #f9f9f9; /* Alternates row colors */
}

.data-table tbody tr:hover {
  background-color: #e8f5e9; /* Subtle hover effect */
  transition: background-color 0.3s ease; /* Smooth hover transition */
}
.pagination {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 20px;
}

.pagination-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.pagination-btn:hover {
  background-color: #45a049;
}

.no-data {
  font-size: 1.2rem;
  color: #757575;
}
/* Change Password Section */
.change-password-container {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  margin: 30px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease-in-out; /* Smooth transition for resizing */
}

.change-password-container h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #333;
}

.change-password-container .form {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.change-password-container .form input {
  padding: 12px;
  margin: 10px 0;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
  transition: all 0.3s ease; /* Smooth input field resizing */
}

.change-password-container .form input[type="password"] {
  width: calc(100% - 20px); /* Full width minus padding */
}

.change-password-container .change-password-btn {
  padding: 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s; /* Smooth transitions */
  width: 100%;
  box-sizing: border-box;
}

.change-password-container .change-password-btn:hover {
  background-color: #45a049;
  transform: scale(1.05);
}

/* Error Message Styling */
.change-password-container .error-message {
  color: white;
  font-size: 1rem;
  margin-top: 10px;
  background-color: #f44336; /* Red background for errors */
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
  text-align: center;
}

/* Success Message Styling */
.change-password-container .success-message {
  color: white;
  font-size: 1rem;
  margin-top: 10px;
  background-color: #4caf50; /* Green background for success */
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
  text-align: center;
}

/* Style for invalid input fields */
.change-password-container .form input.invalid {
  background-color: #f8d7da; /* Light red background for invalid input */
  border-color: #f44336; /* Red border */
}

.change-password-container .form input.invalid:focus {
  outline-color: #f44336; /* Red outline when focused */
}

.change-password-container .form input:focus {
  outline: none;
  border-color: #4caf50;
}

.change-password-container .form input::placeholder {
  color: #aaa;
}



@media (max-width: 600px) {

  .door-status-btn {
    width: 80%; /* Makes the logout button fill 80% of the space */
    margin-top: 20px; /* Adds some space above the button */
 
  }  .change-password-container {
    padding: 15px;
    margin-top: 20px;
  }

  .change-password-container h2 {
    font-size: 1.6rem;
  }

  .change-password-container .form input {
    font-size: 0.9rem;
    padding: 10px;
  }

  .change-password-container .change-password-btn {
    font-size: 1rem;
    padding: 12px;
    width: 100%;
  
}
  .login-container {
    width: 100%;
    padding: 20px;
  }

  h1 {
    font-size: 1.5rem;
  }

   .data-table {
    font-size: 0.9rem; /* Adjust font size for smaller screens */
  }
  .data-table th, .data-table td {
    padding: 10px; /* Reduces padding on smaller screens */
  }
  .logout-btn {
    width: 80%; /* Makes the logout button fill 80% of the space */
    margin-top: 10px; /* Adds some space above the button */
  }
}
</style>