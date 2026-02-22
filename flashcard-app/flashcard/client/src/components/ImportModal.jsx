import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { api } from '../api';
import { parseTexToQuestions } from '../texParser';
import { parseTextToQuestions } from '../textParser';

function getQuestionCount(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.questions)) return data.questions.length;
  if (Array.isArray(data.cards)) return data.cards.length;
  return 0;
}

// Replace markdown image refs in a string using a name→serverPath map
function replaceImageRefs(text, imageMap) {
  if (typeof text !== 'string') return text;
  return text.replace(/!\[([^\]]*)\]\(([^)\s"\\]+)\)/g, (match, alt, src) => {
    const serverPath = imageMap[src] || imageMap[src.split('/').pop()];
    return serverPath ? `![${alt}](${serverPath})` : match;
  });
}

// Deep-replace image refs in any JSON-serializable value
function deepReplaceImageRefs(obj, imageMap) {
  if (typeof obj === 'string') return replaceImageRefs(obj, imageMap);
  if (Array.isArray(obj)) return obj.map(v => deepReplaceImageRefs(v, imageMap));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) result[k] = deepReplaceImageRefs(v, imageMap);
    return result;
  }
  return obj;
}

export default function ImportModal({ onClose, onSuccess, topics = [] }) {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rawFileContent, setRawFileContent] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [bundleProcessing, setBundleProcessing] = useState(false);
  const [bundleProgress, setBundleProgress] = useState(null); // { current, total }
  const [pendingImages, setPendingImages] = useState([]); // images to upload on import

  const fileRef = useRef();
  const folderRef = useRef();
  const zipRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  // webkitdirectory must be set imperatively (React strips unknown boolean attrs)
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute('webkitdirectory', '');
      folderRef.current.setAttribute('directory', '');
    }
  }, []);

  const useNewCollection = collectionId === '__new__';
  const canImport = data && (useNewCollection ? newCollectionName.trim() : collectionId);

  const processFile = (file) => {
    const name = file?.name?.toLowerCase() || '';
    const isJson = name.endsWith('.json');
    const isTex = name.endsWith('.tex');
    const isText = name.endsWith('.txt') || name.endsWith('.md');
    if (!file || (!isJson && !isTex && !isText)) {
      setError('Please select a .json, .tex, .txt or .md file');
      return;
    }
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target.result;
        if (isTex) {
          const parsed = parseTexToQuestions(raw, file.name);
          setData(parsed);
          setRawFileContent(null);
          setCollectionId(topics.length ? (topics[0]?.id || '') : '__new__');
          setNewCollectionName(parsed.title || '');
        } else if (isText) {
          const parsed = parseTextToQuestions(raw, file.name);
          setData(parsed);
          setRawFileContent(null);
          setCollectionId(topics.length ? (topics[0]?.id || '') : '__new__');
          setNewCollectionName(parsed.title || '');
        } else {
          const parsed = JSON.parse(raw);
          setData(parsed);
          setRawFileContent(raw);
          setCollectionId(topics.length ? (topics[0]?.id || '') : '__new__');
          setNewCollectionName(parsed.title || parsed.topic_name || parsed.topic || parsed.name || '');
        }
      } catch (err) {
        setError(isTex ? 'Invalid or unsupported .tex file' : isText ? 'Invalid or unsupported text file' : 'Invalid JSON file');
        setData(null);
        setRawFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  // Normalize a list of files (from folder or zip) into { name, path, text(), blob() }
  const processBundleFiles = async (files) => {
    setError('');
    setData(null);
    setBundleProcessing(true);
    setBundleProgress(null);
    try {
      // Find JSON (skip macOS metadata dirs)
      const jsonFile = files.find(f =>
        f.name.endsWith('.json') && !f.name.startsWith('.') && !f.path?.includes('__MACOSX')
      );
      if (!jsonFile) throw new Error('No JSON file found in the bundle');

      const imageFiles = files.filter(f => /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name));

      const rawJson = await jsonFile.text();
      let jsonData;
      try { jsonData = JSON.parse(rawJson); } catch (e) { throw new Error('Invalid JSON: ' + e.message); }

      // Collect all image refs from the entire JSON
      const allText = JSON.stringify(jsonData);
      const imgRefRe = /!\[([^\]]*)\]\(([^)\s"\\]+)\)/g;
      const referencedSrcs = new Set();
      let m;
      while ((m = imgRefRe.exec(allText)) !== null) referencedSrcs.add(m[2]);

      // Collect referenced images — upload will happen when Import is pressed
      const srcsArr = [...referencedSrcs];
      const pending = [];
      for (const src of srcsArr) {
        const basename = src.split('/').pop();
        const imgFile = imageFiles.find(f => f.name === basename || f.name === src);
        if (imgFile) pending.push({ src, basename, getBlob: imgFile.blob });
      }
      setPendingImages(pending);

      setData(jsonData);
      setRawFileContent(rawJson);
      setFileName(jsonFile.name);
      setCollectionId(topics.length ? (topics[0]?.id || '') : '__new__');
      setNewCollectionName(jsonData.title || jsonData.topic_name || jsonData.topic || jsonData.name || '');
    } catch (err) {
      setError(err.message || 'Bundle import failed');
    } finally {
      setBundleProcessing(false);
      setBundleProgress(null);
    }
  };

  const handleFolderSelect = (e) => {
    const fileList = Array.from(e.target.files);
    if (!fileList.length) return;
    const normalized = fileList.map(f => ({
      name: f.name,
      path: f.webkitRelativePath || f.name,
      text: () => f.text(),
      blob: () => Promise.resolve(f),
    }));
    processBundleFiles(normalized);
    e.target.value = '';
  };

  const handleZipSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setBundleProcessing(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const files = [];
      zip.forEach((relativePath, entry) => {
        if (!entry.dir) {
          const name = relativePath.split('/').pop();
          files.push({
            name,
            path: relativePath,
            text: () => entry.async('string'),
            blob: () => entry.async('blob'),
          });
        }
      });
      await processBundleFiles(files);
    } catch (err) {
      setError(err.message || 'Failed to read ZIP file');
      setBundleProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setError('');
    try {
      // 1. Upload pending images to GCS folder named after the collection
      let finalData = data;
      let finalRaw = rawFileContent;
      if (pendingImages.length > 0) {
        const collectionName = useNewCollection
          ? newCollectionName.trim()
          : topics.find(t => t.id === collectionId)?.name || '';
        const folder = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'uploads';
        const imageMap = {};
        setBundleProgress({ current: 0, total: pendingImages.length });
        for (let i = 0; i < pendingImages.length; i++) {
          const { src, basename, getBlob } = pendingImages[i];
          try {
            const blob = await getBlob();
            const result = await api.uploadImage(new File([blob], basename), folder);
            if (result.path) {
              imageMap[src] = result.path;
              if (basename !== src) imageMap[basename] = result.path;
            }
          } catch (_) { /* skip failed image */ }
          setBundleProgress({ current: i + 1, total: pendingImages.length });
        }
        setBundleProgress(null);
        finalData = deepReplaceImageRefs(data, imageMap);
        finalRaw = JSON.stringify(finalData);
      }

      // 2. Import card data
      const base = useNewCollection
        ? { topic_name: newCollectionName.trim(), ...finalData }
        : { topic_id: collectionId, ...finalData };
      const payload = {
        ...base,
        file_name: fileName || undefined,
        file_title: finalData?.title || finalData?.topic_name || finalData?.topic || finalData?.name || undefined,
        raw_file: finalRaw || undefined,
      };
      const res = await api.importQuestions(payload);
      if (res.error) throw new Error(res.error);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setBundleProgress(null);
    }
  };

  const questionCount = getQuestionCount(data);
  const topicName = data?.title || data?.topic || data?.topic_name || data?.name || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold dark:text-white">Import Questions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-green-600 dark:text-green-400 font-medium">Import successful!</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Close</button>
          </div>
        ) : (
          <>
            {/* Single-file drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input ref={fileRef} type="file" accept=".json,.tex,.txt,.md" className="hidden" onChange={e => processFile(e.target.files[0])} />
              <p className="text-3xl mb-2">📄</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {(!data && !bundleProcessing) ? 'Drop a .json, .tex, .txt or .md file here or click to browse' : (data && !bundleProcessing) ? fileName : ''}
              </p>
            </div>

            {/* Bundle import (folder or ZIP with images) */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-800 px-2 text-xs text-gray-400">or import folder / ZIP with images</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => folderRef.current?.click()}
                disabled={bundleProcessing}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                📂 Select Folder
              </button>
              <button
                onClick={() => zipRef.current?.click()}
                disabled={bundleProcessing}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                🗜 Select ZIP
              </button>
              <input ref={folderRef} type="file" multiple className="hidden" onChange={handleFolderSelect} />
              <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={handleZipSelect} />
            </div>

            {/* Progress: reading bundle or uploading images during import */}
            {(bundleProcessing || (importing && bundleProgress)) && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                {bundleProgress
                  ? `Uploading images… ${bundleProgress.current} / ${bundleProgress.total}`
                  : 'Reading files…'}
              </div>
            )}

            {data && !bundleProcessing && (
              <>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="dark:text-gray-200"><span className="font-medium">From file:</span> {topicName}</p>
                  <p className="dark:text-gray-200"><span className="font-medium">Questions:</span> {questionCount}</p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add to collection</label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.card_count ?? 0} cards)</option>
                    ))}
                    <option value="__new__">+ Create new collection</option>
                  </select>
                  {useNewCollection && (
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name"
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>
              </>
            )}

            {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}

            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">Cancel</button>
              <button
                onClick={handleImport}
                disabled={!canImport || importing || bundleProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
