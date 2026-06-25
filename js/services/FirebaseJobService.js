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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import JobRepository from "../repositories/JobRepository.js";
import { OPEN_JOB_STATUSES } from "../utils/jobSync.js";

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
    suggestedPrice,
    mechanicId = null,
    options = {}
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

    const issueType = serviceName;

    try {
      const docRef = await addDoc(collection(this.firestore, "jobs"), {
        driverId,
        mechanicId: mechanicId || null,
        issueType,
        description,
        locationLabel,
        status: JobStatus.REQUESTED,
        price,
        createdAtMillis: Date.now(),
        ...(serviceCategory ? { serviceCategory } : {}),
        ...(issueType ? { serviceName: issueType } : {}),
        ...(mechanicId ? { loyaltyPointsStarted: true } : {}),
        ...(options.driverName ? { driverName: options.driverName } : {}),
        ...(options.driverPhotoUrl
          ? { driverPhotoUrl: options.driverPhotoUrl }
          : {}),
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

  async listJobs(filter = {}) {
    const constraints = [];
    if (filter.driverId) constraints.push(where("driverId", "==", filter.driverId));
    if (filter.mechanicId) constraints.push(where("mechanicId", "==", filter.mechanicId));
    if (filter.status) constraints.push(where("status", "==", filter.status));

    const collectionRef = collection(this.firestore, "jobs");
    const q = constraints.length
      ? query(collectionRef, ...constraints)
      : query(collectionRef, orderBy("createdAtMillis", "desc"));

    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

    if (constraints.length) {
      jobs.sort(
        (a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)
      );
    }

    return jobs;
  }

  mapSnapshotToJobs(snapshot) {
    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));
  }

  /** Real-time open jobs — matches Android observeOpenJobs() */
  subscribeOpenJobs(onChange, onError) {
    const jobsRef = collection(this.firestore, "jobs");
    const q = query(
      jobsRef,
      where("status", "in", OPEN_JOB_STATUSES),
      orderBy("createdAtMillis", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => onChange(this.mapSnapshotToJobs(snapshot)),
      (error) => {
        console.error("Open jobs listener error:", error);
        onError?.(error);
      }
    );
  }

  /**
   * Available jobs for a mechanic, split into two rule-safe queries so the
   * listener never returns a doc the mechanic can't read (which would fail the
   * whole listener with permission-denied). Combines the unassigned open pool
   * with jobs booked directly to this mechanic.
   */
  subscribeMechanicAvailableJobs(mechanicId, onChange, onError) {
    const jobsRef = collection(this.firestore, "jobs");
    const openPoolQuery = query(
      jobsRef,
      where("status", "==", JobStatus.REQUESTED),
      where("mechanicId", "==", null)
    );
    const directedQuery = query(jobsRef, where("mechanicId", "==", mechanicId));

    let openPoolJobs = [];
    let directedJobs = [];
    let openReady = false;
    let directedReady = false;

    const emit = () => {
      if (!openReady && !directedReady) return;
      const byId = new Map();
      [...openPoolJobs, ...directedJobs].forEach((job) => byId.set(job.id, job));
      onChange(Array.from(byId.values()));
    };

    const handleError = (label) => (error) => {
      console.error(`${label} listener error:`, error);
      onError?.(error);
    };

    const unsubscribeOpenPool = onSnapshot(
      openPoolQuery,
      (snapshot) => {
        openPoolJobs = this.mapSnapshotToJobs(snapshot);
        openReady = true;
        emit();
      },
      handleError("Open pool jobs")
    );

    const unsubscribeDirected = onSnapshot(
      directedQuery,
      (snapshot) => {
        directedJobs = this.mapSnapshotToJobs(snapshot);
        directedReady = true;
        emit();
      },
      handleError("Directed jobs")
    );

    return () => {
      unsubscribeOpenPool();
      unsubscribeDirected();
    };
  }

  /** Real-time driver history — matches Android observeDriverJobs() */
  subscribeDriverJobs(driverId, onChange, onError) {
    const q = query(
      collection(this.firestore, "jobs"),
      where("driverId", "==", driverId),
      orderBy("createdAtMillis", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => onChange(this.mapSnapshotToJobs(snapshot)),
      (error) => {
        console.error("Driver jobs listener error:", error);
        onError?.(error);
      }
    );
  }

  /** Real-time mechanic assigned jobs (request history) */
  subscribeMechanicJobs(mechanicId, onChange, onError) {
    const q = query(
      collection(this.firestore, "jobs"),
      where("mechanicId", "==", mechanicId),
      orderBy("createdAtMillis", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => onChange(this.mapSnapshotToJobs(snapshot)),
      (error) => {
        console.error("Mechanic jobs listener error:", error);
        onError?.(error);
      }
    );
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
