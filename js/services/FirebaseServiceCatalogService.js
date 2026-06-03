import { collection, doc, getDoc, getDocs, setDoc, query, limit } from "firebase/firestore";
import { db } from "../../firebase.js";
import { SERVICE_CATEGORIES } from "../serviceCatalogData.js";

export default class FirebaseServiceCatalogService {
  constructor(firestore = db) {
    this.firestore = firestore;
  }

  async getServiceCategories() {
    try {
    const categoriesCollection = collection(this.firestore, "serviceCategories");
    const q = query(categoriesCollection, limit(50));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("No service categories found in Firestore, using local data.");
      return SERVICE_CATEGORIES;
    }

    return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
    } catch (error) {
      console.error("Error fetching service categories from Firestore:", error);
      return SERVICE_CATEGORIES; // Always return local data on failure
  }
  }

  async seedServiceCatalogIfMissing() {
    try {
    const categoriesCollection = collection(this.firestore, "serviceCategories");

    const seedPromises = SERVICE_CATEGORIES.map(async (category) => {
      const docRef = doc(categoriesCollection, category.id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
          console.log(`Seeding missing category: ${category.id}`);
      return setDoc(docRef, {
        name: category.name,
        displayGroup: category.displayGroup,
        groups: category.groups,
      });
  }
    });

    await Promise.all(seedPromises);
    } catch (error) {
      console.error("Error seeding service catalog:", error);
}
}
}

