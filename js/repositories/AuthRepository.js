export default class AuthRepository {
  async signIn(email, password) {
    throw new Error("AuthRepository.signIn() not implemented.");
  }

  async signUp(email, password, name, role, phoneNumber) {
    throw new Error("AuthRepository.signUp() not implemented.");
  }

  async sendPasswordReset(email) {
    throw new Error("AuthRepository.sendPasswordReset() not implemented.");
  }

  async signOut() {
    throw new Error("AuthRepository.signOut() not implemented.");
  }

  async getUserRole(userId) {
    throw new Error("AuthRepository.getUserRole() not implemented.");
  }

  async getUserProfile(userId) {
    throw new Error("AuthRepository.getUserProfile() not implemented.");
  }

  async redeemLoyaltyReward(userId, reward, options) {
    throw new Error("AuthRepository.redeemLoyaltyReward() not implemented.");
  }

  async deleteAccount(currentPassword) {
    throw new Error("AuthRepository.deleteAccount() not implemented.");
  }
}
