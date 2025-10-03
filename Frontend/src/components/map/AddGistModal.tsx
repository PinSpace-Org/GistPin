'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddGistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGist: (content: string) => void;
}

export default function AddGistModal({
  isOpen,
  onClose,
  onAddGist,
}: AddGistModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      onAddGist(content);
      setContent('');
      setIsLoading(false);
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1000] flex items-end justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Pin a New Gist
            </h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's the gist? (max 280 characters)"
              maxLength={280}
              className="w-full p-3 border rounded-lg h-28 bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full mt-4 px-6 py-3 text-lg font-semibold text-white  rounded-lg   bg-gradient-to-r from-purple-600 via-blue-600 to-pink-400 
                            bg-[size:200%_auto] 
                            hover:bg-[position:100%_center] 
                    transition-all duration-500 ease-in-out disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Pinning...' : 'Pin Gist'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
