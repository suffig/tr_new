import { useState, useCallback, useRef } from 'react';
import { ConfirmationModal } from './EnhancedModals';
import { useHapticFeedback, IOSToast } from './IOSComponents';
import { triggerNotification } from './NotificationSystem';

export default function EnhancedDeletionSystem({ onDelete, type, data, className = "" }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  
  const { triggerHaptic } = useHapticFeedback();
  const abortController = useRef(null);

  // Undo system
  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      setShowProgress(true);
      setProgress(0);
      triggerHaptic('medium');

      // Create abort controller for cancellation
      abortController.current = new AbortController();

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Store deletion data for undo
      setRecentlyDeleted({
        type,
        data: Array.isArray(data) ? [...data] : { ...data },
        timestamp: Date.now()
      });

      // Perform deletion
      await onDelete(abortController.current.signal);

      clearInterval(progressInterval);
      setProgress(100);

      // Show success feedback
      triggerHaptic('success');
      setToastType('success');
      setToastMessage(getDeletionSuccessMessage(type, data));
      setShowToast(true);

      // Start undo countdown
      startUndoCountdown();

      // Send notification
      triggerNotification('system-update', {
        message: `${Array.isArray(data) ? data.length : 1} ${type} gelöscht`
      });

    } catch (error) {
      triggerHaptic('error');
      setToastType('error');
      setToastMessage(`Fehler beim Löschen: ${error.message}`);
      setShowToast(true);
      setRecentlyDeleted(null);
    } finally {
      setIsDeleting(false);
      setShowProgress(false);
      setShowConfirmation(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [onDelete, type, data, triggerHaptic]);

  const startUndoCountdown = () => {
    const timer = setTimeout(() => {
      setRecentlyDeleted(null);
    }, 10000); // 10 second undo window
    
    setUndoTimer(timer);
  };

  const handleUndo = useCallback(async () => {
    if (!recentlyDeleted) return;

    try {
      triggerHaptic('light');
      
      // Clear undo timer
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }

      // Here you would implement the undo logic
      // This would depend on your backend implementation
      console.log('Undo operation for:', recentlyDeleted);
      
      setToastType('info');
      setToastMessage('Löschung rückgängig gemacht');
      setShowToast(true);
      
      setRecentlyDeleted(null);
      
      triggerNotification('system-update', {
        message: 'Löschung rückgängig gemacht'
      });

    } catch (error) {
      triggerHaptic('error');
      setToastType('error');
      setToastMessage(`Fehler beim Rückgängigmachen: ${error.message}`);
      setShowToast(true);
    }
  }, [recentlyDeleted, undoTimer, triggerHaptic]);

  const handleCancel = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsDeleting(false);
    setShowProgress(false);
    triggerHaptic('light');
  };

  const getDeletionSuccessMessage = (type, data) => {
    const count = Array.isArray(data) ? data.length : 1;
    switch (type) {
      case 'match':
        return count === 1 ? 'Spiel erfolgreich gelöscht' : `${count} Spiele erfolgreich gelöscht`;
      case 'player':
        return count === 1 ? 'Spieler erfolgreich gelöscht' : `${count} Spieler erfolgreich gelöscht`;
      case 'ban':
        return count === 1 ? 'Sperre erfolgreich gelöscht' : `${count} Sperren erfolgreich gelöscht`;
      case 'transaction':
        return count === 1 ? 'Transaktion erfolgreich gelöscht' : `${count} Transaktionen erfolgreich gelöscht`;
      default:
        return 'Erfolgreich gelöscht';
    }
  };

  const getConfirmationTitle = () => {
    const count = Array.isArray(data) ? data.length : 1;
    return count === 1 ? 'Eintrag löschen?' : `${count} Einträge löschen?`;
  };

  const getConfirmationMessage = () => {
    const count = Array.isArray(data) ? data.length : 1;
    let baseMessage = '';
    
    switch (type) {
      case 'match':
        baseMessage = count === 1 
          ? 'Möchten Sie dieses Spiel wirklich löschen?' 
          : `Möchten Sie diese ${count} Spiele wirklich löschen?`;
        break;
      case 'player':
        baseMessage = count === 1 
          ? 'Möchten Sie diesen Spieler wirklich löschen?' 
          : `Möchten Sie diese ${count} Spieler wirklich löschen?`;
        break;
      case 'ban':
        baseMessage = count === 1 
          ? 'Möchten Sie diese Sperre wirklich löschen?' 
          : `Möchten Sie diese ${count} Sperren wirklich löschen?`;
        break;
      case 'transaction':
        baseMessage = count === 1 
          ? 'Möchten Sie diese Transaktion wirklich löschen?' 
          : `Möchten Sie diese ${count} Transaktionen wirklich löschen?`;
        break;
      default:
        baseMessage = count === 1 
          ? 'Möchten Sie diesen Eintrag wirklich löschen?' 
          : `Möchten Sie diese ${count} Einträge wirklich löschen?`;
    }

    return `${baseMessage}\n\nDiese Aktion kann 10 Sekunden lang rückgängig gemacht werden.`;
  };

  return (
    <>
      {/* Delete Button */}
      <button
        onClick={() => setShowConfirmation(true)}
        disabled={isDeleting}
        className={`
          inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg
          transition-all duration-200 hover:scale-105 active:scale-95
          ${isDeleting 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
          }
          ${className}
        `}
      >
        {isDeleting ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span>Lösche...</span>
          </>
        ) : (
          <>
            <i className="fas fa-trash" />
            <span>Löschen</span>
          </>
        )}
      </button>

      {/* Progress Overlay */}
      {showProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-trash text-2xl text-red-600" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {Array.isArray(data) && data.length > 1 ? 'Lösche Einträge...' : 'Lösche Eintrag...'}
              </h3>
              
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{progress}%</p>
              </div>
              
              {progress < 90 && (
                <button
                  onClick={handleCancel}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {recentlyDeleted && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-gray-900 text-white rounded-lg p-4 shadow-lg max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <i className="fas fa-check-circle text-green-400" />
                <span className="text-sm">
                  {getDeletionSuccessMessage(type, recentlyDeleted.data)}
                </span>
              </div>
              <button
                onClick={handleUndo}
                className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Rückgängig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleDelete}
        title={getConfirmationTitle()}
        message={getConfirmationMessage()}
        confirmText="Jetzt löschen"
        cancelText="Abbrechen"
        type="danger"
      />

      {/* Toast Notification */}
      <IOSToast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      />
    </>
  );
}

// Batch deletion with progress tracking
export function BatchDeletionManager({ items, onDelete, className = "" }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(null);
  const [completedItems, setCompletedItems] = useState([]);
  const [failedItems, setFailedItems] = useState([]);
  const [showResults, setShowResults] = useState(false);
  
  const { triggerHaptic } = useHapticFeedback();

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    setProgress(0);
    setCompletedItems([]);
    setFailedItems([]);
    triggerHaptic('medium');

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setCurrentItem(item);
        setProgress((i / items.length) * 100);

        try {
          await onDelete(item);
          setCompletedItems(prev => [...prev, item]);
          triggerHaptic('light');
        } catch (error) {
          setFailedItems(prev => [...prev, { item, error: error.message }]);
          triggerHaptic('error');
        }

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setProgress(100);
      setCurrentItem(null);
      setShowResults(true);
      triggerHaptic('success');

    } catch (error) {
      triggerHaptic('error');
      console.error('Batch deletion failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleBatchDelete}
        disabled={isDeleting || items.length === 0}
        className={`
          inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg
          transition-all duration-200 hover:scale-105 active:scale-95
          ${isDeleting || items.length === 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
          }
          ${className}
        `}
      >
        {isDeleting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Lösche {completedItems.length + 1}/{items.length}...</span>
          </>
        ) : (
          <>
            <i className="fas fa-trash" />
            <span>Alle löschen ({items.length})</span>
          </>
        )}
      </button>

      {/* Progress Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lösche {items.length} Einträge
              </h3>
              
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {Math.round(progress)}% ({completedItems.length}/{items.length})
                </p>
              </div>
              
              {currentItem && (
                <p className="text-sm text-gray-700 mb-4">
                  Aktuell: {currentItem.name || `ID ${currentItem.id}`}
                </p>
              )}

              {failedItems.length > 0 && (
                <p className="text-sm text-red-600 mb-4">
                  {failedItems.length} Fehler
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  failedItems.length === 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <i className={`text-2xl ${
                    failedItems.length === 0 ? 'fas fa-check text-green-600' : 'fas fa-exclamation-triangle text-yellow-600'
                  }`} />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Löschvorgang abgeschlossen
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600 mb-6">
                <p>✅ Erfolgreich: {completedItems.length}</p>
                {failedItems.length > 0 && (
                  <p>❌ Fehlgeschlagen: {failedItems.length}</p>
                )}
              </div>
              
              <button
                onClick={() => setShowResults(false)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}