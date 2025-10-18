/**
 * @file Batch Utility Functions
 * @description Helper functions for parsing and formatting batch data
 */

/**
 * Parses product name and batch number from tokenURI
 * Expected format: ipfs://pharmaledger/{productName}/{batchNumber}
 * Also handles legacy formats gracefully
 */
export function parseTokenURI(tokenURI: string): { productName: string; batchNumber: string } {
  try {
    // Handle our new custom format: ipfs://pharmaledger/{productName}/{batchNumber}
    if (tokenURI.startsWith('ipfs://pharmaledger/')) {
      const path = tokenURI.replace('ipfs://pharmaledger/', '');
      const parts = path.split('/');

      if (parts.length >= 2) {
        return {
          productName: decodeURIComponent(parts[0]),
          batchNumber: decodeURIComponent(parts[1]),
        };
      }
    }

    // Fallback for legacy formats: treat entire URI as batch identifier
    // Extract meaningful part from old tokenURIs like "ipfs://Carsonnnn" or "ipfs://QmTest123"
    const cleanURI = tokenURI.replace('ipfs://', '').replace('https://', '');
    return {
      productName: cleanURI, // Use the URI content as product name for old batches
      batchNumber: 'Legacy Batch',
    };
  } catch (error) {
    console.error('Failed to parse tokenURI:', error);
    return {
      productName: 'Unknown Product',
      batchNumber: 'Unknown',
    };
  }
}

/**
 * Formats a batch display name
 */
export function formatBatchName(productName: string, batchNumber: string): string {
  return `${productName} (${batchNumber})`;
}
