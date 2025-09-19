import { useState } from 'react';
import { triggerNotification } from './NotificationSystem';

export default function SocialSharing() {
  // Disabled due to linting issues - component functionality moved to ShareButton
  /*
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Generate shareable content
  const generateShareContent = (type, data) => {
    switch (type) {
      case 'achievement':
        return {
          title: `🏆 Achievement Unlocked!`,
          text: `Ich habe "${data.name}" im FIFA Tracker erreicht! ${data.description}`,
          url: window.location.origin,
          hashtags: ['FIFATracker', 'Achievement', 'Gaming']
        };
      case 'match-result':
        return {
          title: `⚽ Match Result`,
          text: `Spiel beendet: AEK ${data.goalsa} - ${data.goalsb} Real! ${data.manofthematch ? `Spieler des Spiels: ${data.manofthematch}` : ''}`,
          url: window.location.origin,
          hashtags: ['FIFATracker', 'Match', 'Football']
        };
      case 'player-milestone':
        return {
          title: `🌟 Player Milestone`,
          text: `${data.playerName} hat ${data.goals} Tore erreicht! Ein wahrer Champion! 🎯`,
          url: window.location.origin,
          hashtags: ['FIFATracker', 'Goals', 'Player']
        };
      case 'team-stats':
        return {
          title: `📊 Team Statistics`,
          text: `Aktuelle FIFA Tracker Stats: AEK vs Real - Spannende Saison! 🔥`,
          url: window.location.origin,
          hashtags: ['FIFATracker', 'Statistics', 'Team']
        };
      default:
        return {
          title: 'FIFA Tracker',
          text: 'Verfolge deine FIFA-Spiele mit dem ultimativen Tracker!',
          url: window.location.origin,
          hashtags: ['FIFATracker']
        };
    }
  };

  const shareToTwitter = (content) => {
    const tweetText = `${content.text}\n\n${content.hashtags.map(tag => `#${tag}`).join(' ')}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(content.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = (content) => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}&quote=${encodeURIComponent(content.text)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToWhatsApp = (content) => {
    const text = `${content.text}\n${content.url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = (content) => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(content.url)}&text=${encodeURIComponent(content.text)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async (content) => {
    const text = `${content.text}\n${content.url}`;
    try {
      await navigator.clipboard.writeText(text);
      triggerNotification('system-update', { message: 'Link in Zwischenablage kopiert!' });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      triggerNotification('system-update', { message: 'Link in Zwischenablage kopiert!' });
    }
  };

  const shareNatively = async (content) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url
        });
      } catch (err) {
        console.log('Native sharing canceled or failed');
      }
    } else {
      // Fallback to copy to clipboard
      copyToClipboard(content);
    }
  };

  const handleShare = (platform, content) => {
    switch (platform) {
      case 'twitter':
        shareToTwitter(content);
        break;
      case 'facebook':
        shareToFacebook(content);
        break;
      case 'whatsapp':
        shareToWhatsApp(content);
        break;
      case 'telegram':
        shareToTelegram(content);
        break;
      case 'copy':
        copyToClipboard(content);
        break;
      case 'native':
        shareNatively(content);
        break;
    }
    setShareModalOpen(false);
  };
  */

  // const shareContent = shareData ? generateShareContent(shareType, shareData) : null;

  return (
    <>
      {/* Share Modal - Commented out due to undefined variables */}
      {/*
      {shareModalOpen && shareContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Teilen</h3>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">{shareContent.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{shareContent.text}</p>
                <p className="text-xs text-gray-500">{shareContent.url}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {navigator.share && (
                  <button
                    onClick={() => handleShare('native', shareContent)}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-share text-gray-600" />
                    <span className="text-sm">System</span>
                  </button>
                )}

                <button
                  onClick={() => handleShare('twitter', shareContent)}
                  className="flex items-center justify-center space-x-2 p-3 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <i className="fab fa-twitter" />
                  <span className="text-sm">Twitter</span>
                </button>

                <button
                  onClick={() => handleShare('facebook', shareContent)}
                  className="flex items-center justify-center space-x-2 p-3 border border-blue-600 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fab fa-facebook-f" />
                  <span className="text-sm">Facebook</span>
                </button>

                <button
                  onClick={() => handleShare('whatsapp', shareContent)}
                  className="flex items-center justify-center space-x-2 p-3 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <i className="fab fa-whatsapp" />
                  <span className="text-sm">WhatsApp</span>
                </button>

                <button
                  onClick={() => handleShare('telegram', shareContent)}
                  className="flex items-center justify-center space-x-2 p-3 border border-blue-400 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  <i className="fab fa-telegram" />
                  <span className="text-sm">Telegram</span>
                </button>

                <button
                  onClick={() => handleShare('copy', shareContent)}
                  className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <i className="fas fa-copy text-gray-600" />
                  <span className="text-sm">Kopieren</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      */}
    </>
  );
}

// Share Button Component
export function ShareButton({ type, data, className = "", children }) {
  const [socialSharing, setSocialSharing] = useState(null);

  const handleShare = () => {
    // Create a temporary instance to trigger sharing
    const shareContent = generateShareContent(type, data);
    
    // Try native sharing first (mobile)
    if (navigator.share) {
      navigator.share({
        title: shareContent.title,
        text: shareContent.text,
        url: shareContent.url
      }).catch(() => {
        // If native sharing fails, show modal
        setSocialSharing({ type, data });
      });
    } else {
      // Show modal for desktop
      setSocialSharing({ type, data });
    }
  };

  const generateShareContent = (type, data) => {
    switch (type) {
      case 'achievement':
        return {
          title: `🏆 Achievement Unlocked!`,
          text: `Ich habe "${data.name}" im FIFA Tracker erreicht! ${data.description}`,
          url: window.location.origin
        };
      case 'match-result':
        return {
          title: `⚽ Match Result`,
          text: `Spiel beendet: AEK ${data.goalsa} - ${data.goalsb} Real! ${data.manofthematch ? `Spieler des Spiels: ${data.manofthematch}` : ''}`,
          url: window.location.origin
        };
      case 'player-milestone':
        return {
          title: `🌟 Player Milestone`,
          text: `${data.playerName} hat ${data.goals} Tore erreicht! Ein wahrer Champion! 🎯`,
          url: window.location.origin
        };
      default:
        return {
          title: 'FIFA Tracker',
          text: 'Verfolge deine FIFA-Spiele mit dem ultimativen Tracker!',
          url: window.location.origin
        };
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors ${className}`}
      >
        <i className="fas fa-share" />
        {children && <span>{children}</span>}
      </button>

      {/* Social sharing modal */}
      {socialSharing && (
        <SocialShareModal
          type={socialSharing.type}
          data={socialSharing.data}
          onClose={() => setSocialSharing(null)}
        />
      )}
    </>
  );
}

// Compact Social Share Modal
function SocialShareModal({ type, data, onClose }) {
  const shareContent = generateShareContent(type, data);

  const handleShare = (platform) => {
    switch (platform) {
      case 'twitter': {
        const tweetText = `${shareContent.text}\n\n#FIFATracker`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareContent.url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        break;
      }
      case 'whatsapp': {
        const whatsappText = `${shareContent.text}\n${shareContent.url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank');
        break;
      }
      case 'copy': {
        const text = `${shareContent.text}\n${shareContent.url}`;
        navigator.clipboard.writeText(text).then(() => {
          triggerNotification('system-update', { message: 'Link kopiert!' });
        });
        break;
      }
    }
    onClose();
  };

  const generateShareContent = (type, data) => {
    switch (type) {
      case 'achievement':
        return {
          title: `🏆 Achievement Unlocked!`,
          text: `Ich habe "${data.name}" im FIFA Tracker erreicht! ${data.description}`,
          url: window.location.origin
        };
      case 'match-result':
        return {
          title: `⚽ Match Result`,
          text: `Spiel beendet: AEK ${data.goalsa} - ${data.goalsb} Real!`,
          url: window.location.origin
        };
      default:
        return {
          title: 'FIFA Tracker',
          text: 'Verfolge deine FIFA-Spiele!',
          url: window.location.origin
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Teilen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times" />
          </button>
        </div>
        
        <div className="flex space-x-3 justify-center">
          <button
            onClick={() => handleShare('twitter')}
            className="p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
          >
            <i className="fab fa-twitter text-xl" />
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
          >
            <i className="fab fa-whatsapp text-xl" />
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="p-3 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <i className="fas fa-copy text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
}