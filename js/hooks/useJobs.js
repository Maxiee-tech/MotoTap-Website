import { useState, useCallback } from "react";
import FirebaseJobService, { JobStatus } from "../services/FirebaseJobService.js";

const jobService = new FirebaseJobService();

export function useJobs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createJob = useCallback(async (
    driverId,
    issueType,
    description,
    locationLabel,
    suggestedPrice
  ) => {
    setLoading(true);
    setError(null);
    try {
      const jobId = await jobService.createJob(
        driverId, issueType, description, locationLabel, suggestedPrice
      );
      return jobId;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJobStatus = useCallback(async (jobId, status) => {
    setLoading(true);
    setError(null);
    try {
      await jobService.updateJobStatus(jobId, status);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptJob = useCallback(async (jobId, mechanicId) => {
    setLoading(true);
    setError(null);
    try {
      await jobService.acceptJob(jobId, mechanicId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteJob = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      await jobService.deleteJob(jobId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createJob,
    updateJobStatus,
    acceptJob,
    deleteJob,
    loading,
    error
  };
}