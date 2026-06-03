import { useState, useCallback } from "react";
import FirebaseAuthService from "../services/FirebaseAuthService.js";

const authService = new FirebaseAuthService();

export function useProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateSkills = useCallback(async (userId, skills) => {
    setLoading(true);
    setError(null);
    try {
      await authService.updateMechanicSkills(userId, skills);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (currentPassword) => {
    setLoading(true);
    setError(null);
    try {
      await authService.deleteAccount(currentPassword);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateSkills,
    deleteAccount,
    loading,
    error
  };
}