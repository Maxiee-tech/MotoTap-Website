import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATALOG_VERSION,
} from "../serviceCatalogData.js";

export default class FirebaseServiceCatalogService {
  constructor(firestore = db) {
    this.firestore = firestore;
  }

  /** Local catalog (same as mobile app); does not wait on network. */
  getServiceCategories() {
    return SERVICE_CATEGORIES;
  }

  /** Keep Firestore in sync with mobile app catalog (shared backend). */
  async syncServiceCatalogToFirestore() {
    try {
      const categoriesCollection = collection(
        this.firestore,
        "serviceCategories"
      );

      await Promise.all(
        SERVICE_CATEGORIES.map((category) =>
          setDoc(
            doc(categoriesCollection, category.id),
            {
              name: category.name,
              displayGroup: category.displayGroup,
              groups: category.groups,
              catalogVersion: SERVICE_CATALOG_VERSION,
            },
            { merge: true }
          )
        )
      );
    } catch (error) {
      console.error("Error syncing service catalog to Firestore:", error);
    }
  }

  /** Firestore sync for mobile/backend — run in background, not on UI critical path. */
  seedServiceCatalogIfMissing() {
    return this.syncServiceCatalogToFirestore();
  }
}

