class AuthViewModel {
  constructor(authRepository) {
    this.authRepository = authRepository;
    this.uiState = "idle"; // 'idle', 'loading', 'success', 'error'
    this.errorMessage = "";
    this.successRole = null;
    this.email = "";
    this.password = "";
    this.name = "";
    this.phoneNumber = "";
    this.role = "driver"; // Default
    this.stateChangeListeners = [];
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.stateChangeListeners.push(callback);
  }

  // Unsubscribe from state changes
  unsubscribe(callback) {
    this.stateChangeListeners = this.stateChangeListeners.filter(
      (cb) => cb !== callback
    );
  }

  // Sign in
  async signIn() {
    this.uiState = "loading";
    this.notifyStateChange();

    const result = await this.authRepository.signIn(
      this.email,
      this.password
    );
    if (result.success) {
      const userId = this.authRepository.auth.currentUser?.uid;
      if (userId) {
        const role = await this.authRepository.getUserRole(userId);
        this.uiState = "success";
        this.successRole = role;
      } else {
        this.uiState = "error";
        this.errorMessage = "Login failed.";
      }
    } else {
      this.uiState = "error";
      this.errorMessage = result.error;
    }
    this.notifyStateChange();
  }

  // Sign up
  async signUp() {
    this.uiState = "loading";
    this.notifyStateChange();

    const result = await this.authRepository.signUp(
      this.email,
      this.password,
      this.name,
      this.role,
      this.phoneNumber
    );
    if (result.success) {
      this.uiState = "success";
      this.successRole = this.role;
    } else {
      this.uiState = "error";
      this.errorMessage = result.error;
    }
    this.notifyStateChange();
  }

  // Check existing session
  async checkExistingSession(callback) {
    const user = this.authRepository.auth.currentUser;
    if (user) {
      const role = await this.authRepository.getUserRole(user.uid);
      callback(role);
    }
  }

  // Logout
  async logout(callback) {
    await this.authRepository.signOut();
    this.resetState();
    callback();
  }

  // Delete account
  async deleteAccount(currentPassword, callback) {
    this.uiState = "loading";
    this.notifyStateChange();

    const result = await this.authRepository.deleteAccount(currentPassword);
    if (result.success) {
      this.resetState();
      callback();
    } else {
      this.uiState = "error";
      this.errorMessage = result.error;
      this.notifyStateChange();
    }
  }

  // Reset state
  resetState() {
    this.uiState = "idle";
    this.errorMessage = "";
    this.successRole = null;
    this.email = "";
    this.password = "";
    this.name = "";
    this.phoneNumber = "";
    this.role = "driver";
    this.notifyStateChange();
  }

  // Notify all listeners of state change
  notifyStateChange() {
    const state = {
      uiState: this.uiState,
      errorMessage: this.errorMessage,
      successRole: this.successRole,
    };
    this.stateChangeListeners.forEach((callback) => {
      callback(state);
    });
    console.log("State changed:", state);
  }
}

export default AuthViewModel;
