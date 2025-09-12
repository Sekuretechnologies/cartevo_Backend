import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import { CardCreationMetadata } from "@/utils/cards/maplerad/types";

// Pour l'instant, stockage en mémoire (TODO: Migrer vers Redis en production)
//   const creationCache = new Map<string, CardCreationMetadata>();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

/**
 * 💾 Sauvegarde les métadonnées de création pour une référence
 */
const saveCreationMetadata = async (
  metadata: CardCreationMetadata
): Promise<void> => {
  console.log("💾 Sauvegarde métadonnées création carte", {
    reference: metadata.reference,
    userId: metadata.userId,
    cardBrand: metadata.cardBrand,
    initialBalance: metadata.initialBalance,
    isFirstCard: metadata.isFirstCard,
  });

  // Ajouter timestamp de création
  metadata.createdAt = new Date();

  // Sauvegarder dans la base de données
  await CustomerLogsModel.create({
    reference: metadata.reference,
    customer_id: metadata.userId,
    action: "saveCreationMetadata",
    status: "PENDING",
    log_json: metadata,
    log_txt: `saveCardCreationMetadata : userId: ${metadata.userId} | reference: ${metadata.reference}`,
    created_at: new Date(),
  });

  // Auto-nettoyage après TTL
  // setTimeout(() => {
  //   this.creationCache.delete(metadata.reference);
  //   console.debug(`🧹 Auto-nettoyage cache: ${metadata.reference}`);
  // }, this.CACHE_TTL);

  // console.debug("✅ Métadonnées sauvegardées", {
  //   reference: metadata.reference,
  //   cacheSize: this.creationCache.size,
  // });
};

/**
 * 🔍 Récupère les métadonnées pour une référence
 */
const getCreationMetadata = async (
  reference: string
): Promise<CardCreationMetadata | null> => {
  // Since we don't have a generic get method, we'll need to use Prisma directly
  // or find another way. For now, let's use a workaround with the existing methods
  const result = await CustomerLogsModel.getOne({
    reference,
  });
  const metadata = result.output;

  if (!metadata) {
    console.warn("❌ Métadonnées introuvables", {
      reference,
    });
    return null;
  }

  console.log("✅ Métadonnées récupérées", {
    reference,
    userId: metadata.userId,
    cardBrand: metadata.cardBrand,
    age: Date.now() - metadata.createdAt.getTime(),
  });

  return metadata;
};

/**
 * 🧹 Nettoie les métadonnées après traitement
 */
const cleanupCreationMetadata = async (reference: string): Promise<void> => {
  // Since CustomerLogsModel doesn't have updateMany, we'll use Prisma directly
  // or find another way. For now, let's use a workaround
  const result = await CustomerLogsModel.delete({
    reference,
  });

  console.debug("🧹 Nettoyage métadonnées", {
    reference,
    deleted: !!result.output,
  });
};

/**
 * 📊 Statistiques du cache
 */
//   const getCacheStats=(): { size: number; references: string[] } =>{
//     return {
//       size: this.creationCache.size,
//       references: Array.from(this.creationCache.keys()),
//     };
//   }

/**
 * 🔍 Récupérer les créations en attente depuis plus de X millisecondes
 */

const getPendingCreations = async (
  timeoutMs: number
): Promise<CardCreationMetadata[]> => {
  const cutoffTime = new Date(Date.now() - timeoutMs);

  const result = await CustomerLogsModel.getWithComplexFilters({
    action: { in: ["saveCreationMetadata", "saveCardCreationMetadata"] },
    status: "PENDING",
    created_at: { lt: cutoffTime },
  });

  const pendingLogs = result.output || [];
  const pending: CardCreationMetadata[] = pendingLogs.map(
    (log: any) => log.log_json as CardCreationMetadata
  );

  console.log(`🔍 Créations en attente trouvées: ${pending.length}`, {
    cutoffTime,
    timeoutMs,
  });

  return pending;
};

const cardCreationTrackingService = {
  saveCreationMetadata,
  getCreationMetadata,
  getPendingCreations,
  cleanupCreationMetadata,
};
export default cardCreationTrackingService;
