import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import JobRepository from "../repositories/JobRepository.js";

export const JobStatus = {
  REQUESTED: "REQUESTED",
  MATCHING: "MATCHING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PAID: "PAID",
  CLOSED: "CLOSED"
};

export default class FirebaseJobService extends JobRepository {
  constructor(firestore = db) {
    super();
    this.firestore = firestore;
  }

  async createJobRequest(jobRequest) {
    const collectionRef = collection(this.firestore, "jobRequests");
    const docRef = await addDoc(collectionRef, {
      ...jobRequest,
      createdAtMillis: jobRequest.createdAtMillis || Date.now(),
    });
    return { id: docRef.id };
  }

  async createJob(
    driverId,
    serviceCategoryOrIssueType,
    serviceNameOrDescription,
    descriptionOrLocationLabel,
    locationLabelOrPrice,
    suggestedPrice
  ) {
    let serviceCategory = null;
    let serviceName = null;
    let description = "";
    let locationLabel = "";
    let price = 0;

    if (typeof suggestedPrice !== "undefined") {
      serviceCategory = serviceCategoryOrIssueType;
      serviceName = serviceNameOrDescription;
      description = descriptionOrLocationLabel;
      locationLabel = locationLabelOrPrice;
      price = suggestedPrice;
    } else {
      serviceCategory = null;
      serviceName = serviceCategoryOrIssueType;
      description = serviceNameOrDescription;
      locationLabel = descriptionOrLocationLabel;
      price = locationLabelOrPrice;
    }

    try {
      const docRef = await addDoc(collection(this.firestore, "jobs"), {
        driverId,
        mechanicId: null,
        serviceCategory,
        serviceName,
        issueType: serviceName,
        description,
        locationLabel,
        status: JobStatus.REQUESTED,
        price,
        createdAtMillis: Date.now(),
      });
      return docRef.id;
    } catch (error) {
      throw new Error("Failed to create job request");
    }
  }

  async getJobRequest(jobId) {
    const docRef = doc(this.firestore, "jobRequests", jobId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  async listJobRequests(filter = {}) {
    let q = collection(this.firestore, "jobRequests");
    if (filter.driverId || filter.mechanicId || filter.status) {
      const constraints = [];
      if (filter.driverId) constraints.push(where("driverId", "==", filter.driverId));
      if (filter.mechanicId) constraints.push(where("mechanicId", "==", filter.mechanicId));
      if (filter.status) constraints.push(where("status", "==", filter.status));
      q = query(collection(this.firestore, "jobRequests"), ...constraints, orderBy("createdAtMillis", "desc"));
    } else {
      q = query(collection(this.firestore, "jobRequests"), orderBy("createdAtMillis", "desc"));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
  }

  async updateJobRequest(jobId, updates) {
    const docRef = doc(this.firestore, "jobRequests", jobId);
    await updateDoc(docRef, updates);
    return { success: true };
  }

  async updateJobStatus(jobId, status) {
    try {
      await updateDoc(doc(this.firestore, "jobs", jobId), {
        status: status
      });
    } catch (error) {
      throw new Error("Failed to update job status");
    }
  }

  async acceptJob(jobId, mechanicId) {
    try {
      await updateDoc(doc(this.firestore, "jobs", jobId), {
        mechanicId: mechanicId,
        status: JobStatus.ASSIGNED
      });
    } catch (error) {
      throw new Error("Failed to accept job");
    }
  }

  async deleteJobRequest(jobId) {
    const docRef = doc(this.firestore, "jobRequests", jobId);
    await deleteDoc(docRef);
    return { success: true };
  }

  async deleteJob(jobId) {
    try {
      await deleteDoc(doc(this.firestore, "jobs", jobId));
    } catch (error) {
      throw new Error("Failed to delete job");
    }
  }
}
