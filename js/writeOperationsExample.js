// Example usage of the write operations services and hooks
// This demonstrates how to use the new architecture for CRUD operations

import FirebaseAuthService from "./services/FirebaseAuthService.js";
import FirebaseJobService, { JobStatus } from "./services/FirebaseJobService.js";
import FirebaseChatService from "./services/FirebaseChatService.js";
import { useJobs } from "./hooks/useJobs.js";
import { useChat } from "./hooks/useChat.js";
import { useProfile } from "./hooks/useProfile.js";

// Example: Using services directly (for vanilla JS or non-React code)
export class WriteOperationsExample {
  constructor() {
    this.authService = new FirebaseAuthService();
    this.jobService = new FirebaseJobService();
    this.chatService = new FirebaseChatService();
  }

  // User Profile Operations
  async updateMechanicSkillsExample(userId, skills) {
    try {
      const result = await this.authService.updateMechanicSkills(userId, skills);
      console.log("Skills updated:", result);
      return result;
    } catch (error) {
      console.error("Failed to update skills:", error);
      throw error;
    }
  }

  async deleteAccountExample(currentPassword) {
    try {
      const result = await this.authService.deleteAccount(currentPassword);
      console.log("Account deleted:", result);
      return result;
    } catch (error) {
      console.error("Failed to delete account:", error);
      throw error;
    }
  }

  // Job Operations
  async createJobExample(driverId, issueType, description, location, price) {
    try {
      const jobId = await this.jobService.createJob(
        driverId,
        issueType,
        description,
        location,
        price
      );
      console.log("Job created with ID:", jobId);
      return jobId;
    } catch (error) {
      console.error("Failed to create job:", error);
      throw error;
    }
  }

  async updateJobStatusExample(jobId, status) {
    try {
      await this.jobService.updateJobStatus(jobId, status);
      console.log("Job status updated to:", status);
    } catch (error) {
      console.error("Failed to update job status:", error);
      throw error;
    }
  }

  async acceptJobExample(jobId, mechanicId) {
    try {
      await this.jobService.acceptJob(jobId, mechanicId);
      console.log("Job accepted by mechanic:", mechanicId);
    } catch (error) {
      console.error("Failed to accept job:", error);
      throw error;
    }
  }

  async deleteJobExample(jobId) {
    try {
      await this.jobService.deleteJob(jobId);
      console.log("Job deleted:", jobId);
    } catch (error) {
      console.error("Failed to delete job:", error);
      throw error;
    }
  }

  // Chat Operations
  async sendMessageExample(jobId, senderId, text) {
    try {
      await this.chatService.sendMessageToJob(jobId, senderId, text);
      console.log("Message sent to job:", jobId);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }
}

// Example: Using hooks (for React-style components)
// Note: These would be used in a React component, but shown here for reference

export function JobCreationComponentExample() {
  // In a React component, you would use:
  // const { createJob, loading, error } = useJobs();

  const handleCreateJob = async (formData) => {
    // const { createJob, loading, error } = useJobs();
    // try {
    //   const jobId = await createJob(
    //     currentUser.uid,
    //     formData.issueType,
    //     formData.description,
    //     formData.location,
    //     formData.price
    //   );
    //   console.log("Job created:", jobId);
    // } catch (err) {
    //   console.error("Error:", error);
    // }
  };

  return {
    handleCreateJob
  };
}

export function MechanicDashboardExample() {
  // In a React component, you would use:
  // const { acceptJob, updateJobStatus } = useJobs();
  // const { updateSkills } = useProfile();

  const handleAcceptJob = async (jobId, mechanicId) => {
    // const { acceptJob } = useJobs();
    // await acceptJob(jobId, mechanicId);
  };

  const handleUpdateSkills = async (userId, skills) => {
    // const { updateSkills } = useProfile();
    // await updateSkills(userId, skills);
  };

  return {
    handleAcceptJob,
    handleUpdateSkills
  };
}

export function ChatComponentExample() {
  // In a React component, you would use:
  // const { sendMessage, loading } = useChat();

  const handleSendMessage = async (jobId, senderId, text) => {
    // const { sendMessage } = useChat();
    // await sendMessage(jobId, senderId, text);
  };

  return {
    handleSendMessage
  };
}

// Usage examples
export async function runWriteOperationsDemo() {
  const example = new WriteOperationsExample();

  try {
    // Example user profile operations
    console.log("=== User Profile Operations ===");
    // await example.updateMechanicSkillsExample("userId", ["engine", "brakes"]);

    // Example job operations
    console.log("=== Job Operations ===");
    // const jobId = await example.createJobExample(
    //   "driverId",
    //   "Engine Issue",
    //   "Car won't start",
    //   "Downtown",
    //   50
    // );
    // await example.updateJobStatusExample(jobId, JobStatus.IN_PROGRESS);
    // await example.acceptJobExample(jobId, "mechanicId");

    // Example chat operations
    console.log("=== Chat Operations ===");
    // await example.sendMessageExample(jobId, "senderId", "Hello, I'm on my way!");

  } catch (error) {
    console.error("Demo error:", error);
  }
}