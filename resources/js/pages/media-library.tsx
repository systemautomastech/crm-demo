import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import { Upload, Search, X, Plus, Info, Copy, Download, MoreHorizontal, Image as ImageIcon, Calendar, HardDrive, BarChart3, Edit, Trash2, Folder, FolderOpen, Home, ArrowLeft } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { downloadFile, formatDate, formatDateTime } from '@/utils/helpers';

interface MediaItem {
  id: number;
  name: string;
  file_name: string;
  url: string;
  thumb_url: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export default function MediaLibraryDemo() {
  const { t } = useTranslation();
  const { props } = usePage();
  const csrfToken = (props as any).csrf_token || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [directories, setDirectories] = useState<any[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<number | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCreateDirectory, setShowCreateDirectory] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [editingDirectory, setEditingDirectory] = useState<number | null>(null);
  const [editDirectoryName, setEditDirectoryName] = useState('');
  const [deleteDirectoryState, setDeleteDirectoryState] = useState<{isOpen: boolean; id: number | null; isLoading: boolean}>({isOpen: false, id: null, isLoading: false});

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedMediaInfo, setSelectedMediaInfo] = useState<MediaItem | null>(null);
  const itemsPerPage = 12;

  const fetchMedia = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentDirectory) {
        params.append('directory_id', currentDirectory.toString());
      }

      const response = await fetch(`${route('media.index')}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const mediaArray = Array.isArray(data.media) ? data.media : Array.isArray(data) ? data : [];
      setMedia(mediaArray);
      setDirectories(data.directories || []);
      setFilteredMedia(mediaArray);
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error(t('Failed to load media'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [currentDirectory]);

  useEffect(() => {
    const shouldShowLoader = media.length === 0;
    fetchMedia(shouldShowLoader);
  }, [fetchMedia]);

  const createDirectory = async () => {
    if (!newDirectoryName.trim()) {
      toast.error(t('Please enter a directory name'));
      return;
    }

    try {
      const response = await fetch(route('media.directories.create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ name: newDirectoryName }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t('Directory created successfully'));
        setNewDirectoryName('');
        setShowCreateDirectory(false);
        fetchMedia(false);
      } else {
        toast.error(data.message || t('Failed to create directory'));
      }
    } catch (error) {
      console.error('Create directory error:', error);
      toast.error(t('Failed to create directory'));
    }
  };

  const updateDirectory = async () => {
    if (!editDirectoryName.trim()) {
      toast.error(t('Please enter a directory name'));
      return;
    }
    if (!editingDirectory) return;

    try {
      const response = await fetch(route('media.directories.update', editingDirectory), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ name: editDirectoryName }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t('Directory updated successfully'));
        setEditDirectoryName('');
        setEditingDirectory(null);
        fetchMedia(false);
      } else {
        toast.error(data.message || t('Failed to update directory'));
      }
    } catch (error) {
      console.error('Update directory error:', error);
      toast.error(t('Failed to update directory'));
    }
  };

  const deleteDirectory = async (id: number) => {
    setDeleteDirectoryState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(route('media.directories.destroy', id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t('Directory deleted successfully'));
        if (currentDirectory === id) {
          setCurrentDirectory(null);
        }
        fetchMedia(false);
      } else {
        toast.error(data.message || t('Failed to delete directory'));
      }
    } catch (error) {
      console.error('Delete directory error:', error);
      toast.error(t('Failed to delete directory'));
    } finally {
      setDeleteDirectoryState({isOpen: false, id: null, isLoading: false});
    }
  };



  useEffect(() => {
    const mediaArray = Array.isArray(media) ? media : [];
    const filtered = mediaArray.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedia(filtered);
    setCurrentPage(1);
  }, [searchTerm, media]);

  // Filter directories based on search
  const filteredDirectories = useMemo(() => {
    if (!searchTerm) return directories;
    return directories.filter((dir: any) => 
      dir.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, directories]);



  const handleFileUpload = async (files: FileList) => {
    setUploading(true);

    const validFiles = Array.from(files);

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files[]', file);
    });
    if (currentDirectory) {
      formData.append('directory_id', currentDirectory.toString());
    }

    try {
      const response = await fetch(route('media.batch'), {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData,
        credentials: 'same-origin',
      });

      const result = await response.json();

      if (response.ok) {
        fetchMedia(false); // Refresh without loader
        toast.success(result.message);

        // Show individual errors if any
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => {
            toast.error(error);
          });
        }
      } else {
        // Show individual errors if available, otherwise show main message
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => {
            toast.error(error);
          });
        } else {
          toast.error(result.message || t('Failed to upload files'));
        }
      }
    } catch (error) {
      toast.error(t('Error uploading files'));
    }

    setUploading(false);
    setIsUploadModalOpen(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const deleteMedia = async (id: number) => {
    try {
      const response = await fetch(route('media.destroy', id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (response.ok) {
        setMedia(prev => prev.filter(item => item.id !== id));
        toast.success(data.message || t('Media deleted successfully'));
      } else {
        toast.error(data.message || t('Failed to delete media'));
      }
    } catch (error) {
      console.error('Delete media error:', error);
      toast.error(t('Error deleting media'));
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(t('File URL copied to clipboard'));
  };

  const handleDownload = (url: string) => {
    downloadFile(url);
  };

  const handleShowInfo = (item: MediaItem) => {
    setSelectedMediaInfo(item);
    setInfoModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = [t('Bytes'), t('KB'), t('MB'), t('GB')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.includes('pdf')) return <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white text-lg flex items-center justify-center font-bold shadow-lg">PDF</div>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white text-lg flex items-center justify-center font-bold shadow-lg">DOC</div>;
    if (mimeType.includes('csv') || mimeType.includes('spreadsheet')) return <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white text-lg flex items-center justify-center font-bold shadow-lg">CSV</div>;
    if (mimeType.startsWith('video/')) return <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white text-lg flex items-center justify-center font-bold shadow-lg">VID</div>;
    if (mimeType.startsWith('audio/')) return <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white text-lg flex items-center justify-center font-bold shadow-lg">AUD</div>;
    return <div className="h-12 w-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl text-white text-sm flex items-center justify-center font-bold shadow-lg">FILE</div>;
  };

  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  const allFilesFolder = useMemo(() => (
    <div
      key="all-files-folder"
      className="group relative bg-card border-2 rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => {
        setCurrentDirectory(null);
        setShowAllFiles(true);
        setSearchTerm(''); // Clear search when viewing all files
      }}
    >
      {/* Directory Preview Container */}
      <div className="relative aspect-square bg-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-4">
          <div className="mb-2 text-primary group-hover:scale-110 transition-transform duration-300">
            <Folder className="h-16 w-16" />
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

        {/* Directory Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="text-xs font-semibold bg-background shadow-md">
            📂 {t('FOLDER')}
          </Badge>
        </div>
      </div>

      {/* Directory Content */}
      <div className="p-4 space-y-2">
        <div>
          <h3 className="text-sm font-semibold truncate flex items-center gap-2 group-hover:text-primary transition-colors" title="All Files">
            <FolderOpen className="h-4 w-4 text-primary" />
            {t('All Files')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {t('View all files')}
          </p>
        </div>
      </div>
    </div>
  ), []);

  const breadcrumbs = [
    { label: t('Media Library') }
  ];

  return (
    <AuthenticatedLayout
      breadcrumbs={breadcrumbs}
      pageTitle={t('Manage Media Library')}
      pageActions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateDirectory(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('New Folder')}
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('Upload Files')}
          </Button>
        </div>
      }
    >
      <Head title={t('Media Library')} />
      <div className="space-y-6">

        {/* Combined: Breadcrumb, Search & Stats */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            {/* Top Row: Breadcrumb & Stats */}
            <div className="flex items-center justify-between gap-4 mb-4">
              {/* Left: Navigation */}
              <nav className="flex items-center space-x-1 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentDirectory(null);
                    setShowAllFiles(false);
                    setSearchTerm(''); // Clear search when going home
                  }}
                  className="flex items-center gap-2 h-8 px-2 hover:bg-muted font-medium transition-all text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-4 w-4" />
                  {t('Media Library')}
                </Button>
                {currentDirectory && (
                  <>
                    <span className="mx-1 text-muted-foreground/40">/</span>
                    <span className="flex items-center gap-2 px-2 py-1 text-foreground font-medium">
                      <Folder className="h-3.5 w-3.5 text-primary" />
                      {directories.find(d => d.id === currentDirectory)?.name || t('Directory')}
                    </span>
                  </>
                )}
                {showAllFiles && (
                  <>
                    <span className="mx-1 text-muted-foreground/40">/</span>
                    <span className="flex items-center gap-2 px-2 py-1 text-foreground font-medium">
                      <Folder className="h-3.5 w-3.5 text-primary" />
                      {t('All Files')}
                    </span>
                  </>
                )}
              </nav>

              {/* Right: Stats & Back Button */}
              <div className="flex items-center gap-4">
                {/* Compact Stats */}
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold">{filteredMedia.length}</span>
                    <span className="text-muted-foreground">{t('Files')}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold">
                      {formatFileSize(useMemo(() => filteredMedia.reduce((acc, item) => acc + item.size, 0), [filteredMedia]))}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold">
                      {filteredMedia.filter(item => item.mime_type.startsWith('image/')).length}
                    </span>
                    <span className="text-muted-foreground">{t('Images')}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold">{directories.length + 1}</span>
                    <span className="text-muted-foreground">{t('Folders')}</span>
                  </div>
                </div>

                {/* Back Button */}
                {(currentDirectory !== null || showAllFiles) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentDirectory(null);
                      setShowAllFiles(false);
                      setSearchTerm(''); // Clear search when going back
                    }}
                    className="flex items-center gap-2 h-8 px-3 font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('Back')}
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom Row: Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('Search media files...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('Found')} <span className="font-semibold">{(currentDirectory === null && !showAllFiles) ? filteredDirectories.length + filteredMedia.length : filteredMedia.length}</span> {t('results')}
              </p>
            )}

            {showCreateDirectory && (
              <div className="mt-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('Directory name...')}
                    value={newDirectoryName}
                    onChange={(e) => setNewDirectoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createDirectory()}
                    className="h-11 border-2 focus:border-primary"
                  />
                  <Button onClick={createDirectory} size="sm" className="h-11 px-6 font-semibold shadow-md">
                    {t('Create')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateDirectory(false);
                      setNewDirectoryName('');
                    }}
                    className="h-11 px-6 font-semibold"
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            )}

            {editingDirectory && (
              <div className="mt-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('Directory name...')}
                    value={editDirectoryName}
                    onChange={(e) => setEditDirectoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && updateDirectory()}
                    className="h-11 border-2 focus:border-primary"
                  />
                  <Button onClick={updateDirectory} size="sm" className="h-11 px-6 font-semibold shadow-md">
                    {t('Update')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingDirectory(null);
                      setEditDirectoryName('');
                    }}
                    className="h-11 px-6 font-semibold"
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Grid */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-20">
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/50 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-muted-foreground animate-pulse">{t('Loading media...')}</p>
              </div>
            ) : (currentMedia.length === 0 && filteredDirectories.length === 0 && (currentDirectory === null && !showAllFiles)) ? (
              <div className="text-center py-20">
                <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                  <ImageIcon className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{searchTerm ? t('No results found') : t('No media files found')}</h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                  {searchTerm ? t('No folders or files match "{{term}}"', { term: searchTerm }) : t('Get started by uploading your first file')}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    size="lg"
                    className="h-12 px-8 text-base font-semibold shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t('Upload Files')}
                  </Button>
                )}
              </div>
            ) : currentMedia.length === 0 && (currentDirectory !== null || showAllFiles) ? (
              <div className="text-center py-20">
                <div className="mx-auto w-32 h-32 bg-gradient-to-br from-muted/50 to-muted/20 rounded-3xl flex items-center justify-center mb-6">
                  <Folder className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('This folder is empty')}</h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                  {searchTerm ? t('No files match your search') : t('Upload files to this folder to get started')}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    size="lg"
                    className="h-12 px-8 text-base font-semibold shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t('Upload Files')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentDirectory(null);
                      setShowAllFiles(false);
                      setSearchTerm(''); // Clear search when going back to library
                    }}
                    size="lg"
                    className="h-12 px-8 text-base font-semibold"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('Back to Library')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {/* All Files Folder - Only show when not in a specific directory and not showing all files */}
                  {currentDirectory === null && !showAllFiles && (!searchTerm || 'all files'.includes(searchTerm.toLowerCase())) && allFilesFolder}

                  {/* Directory Cards - Only show when not in a specific directory and not showing all files */}
                  {currentDirectory === null && !showAllFiles && filteredDirectories.map((directory: any) => (
                    <div
                      key={`dir-${directory.id}`}
                      className="group relative bg-card border-2 rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setMedia([]);
                        setFilteredMedia([]);
                        setCurrentDirectory(directory.id);
                        setShowAllFiles(false);
                        setSearchTerm(''); // Clear search when entering folder
                      }}
                    >
                      {/* Directory Preview Container */}
                      <div className="relative aspect-square bg-muted/30 flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center p-4">
                          <div className="mb-2 text-primary group-hover:scale-110 transition-transform duration-300">
                            <Folder className="h-16 w-16" />
                          </div>
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                        {/* Directory Actions */}
                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-background/95 hover:bg-background shadow-md"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setEditingDirectory(directory.id);
                                setEditDirectoryName(directory.name);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('Edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDirectoryState({isOpen: true, id: directory.id});
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Directory Type Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="text-xs font-semibold bg-background shadow-md">
                            📁 FOLDER
                          </Badge>
                        </div>
                      </div>

                      {/* Directory Content */}
                      <div className="p-4 space-y-2">
                        <div>
                          <h3 className="text-sm font-semibold truncate flex items-center gap-2 group-hover:text-primary transition-colors" title={directory.name}>
                            <FolderOpen className="h-4 w-4 text-primary" />
                            {directory.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            {t('Directory')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Media Files - Only show when in a directory or showing all files */}
                  {(currentDirectory !== null || showAllFiles) && currentMedia.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-card border-2 rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* File Preview Container */}
                      <div className="relative aspect-square bg-gradient-to-br from-muted/30 to-muted/60 flex items-center justify-center">
                        {item.mime_type.startsWith('image/') ? (
                          <>
                            <img
                              src={item.thumb_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = item.url;
                              }}
                            />
                            {/* Image Overlay on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4">
                            <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                              {getFileIcon(item.mime_type)}
                            </div>
                            <div className="text-xs text-center font-semibold text-muted-foreground truncate w-full px-2">
                              {item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </div>
                          </div>
                        )}

                        {/* Quick Actions - Show on Hover */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-9 w-9 p-0 bg-background/95 hover:bg-background shadow-lg backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowInfo(item);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-9 w-9 p-0 bg-background/95 hover:bg-background shadow-lg backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(item.url);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-9 w-9 p-0 bg-background/95 hover:bg-background shadow-lg backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item.url);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Action Dropdown */}
                        {!infoModalOpen && !isUploadModalOpen && (
                          <div className="absolute top-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-background/95 hover:bg-background shadow-md"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => handleShowInfo(item)}>
                                  <Info className="h-4 w-4 mr-2" />
                                  {t('View Info')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyLink(item.url)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  {t('Copy Link')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(item.url)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  {t('Download')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteMedia(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  {t('Delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* File Type Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="text-xs font-semibold bg-background/95 backdrop-blur-sm shadow-md">
                            {item.mime_type.split('/')[1].toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2 bg-gradient-to-b from-transparent to-muted/30">
                        <div>
                          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors" title={item.name}>
                            {item.name}
                          </h3>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatFileSize(item.size)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination - Only show when viewing files (not on root with folders) */}
                {totalPages > 1 && (currentDirectory !== null || showAllFiles) && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t-2">
                    <div className="text-sm text-muted-foreground font-medium">
                      {t('Showing')} <span className="font-bold text-foreground">{startIndex + 1}</span> {t('to')} <span className="font-bold text-foreground">{Math.min(startIndex + itemsPerPage, filteredMedia.length)}</span> {t('of')} <span className="font-bold text-foreground">{filteredMedia.length}</span> {t('files')}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="h-10 px-4 font-semibold"
                      >
                        {t('Previous')}
                      </Button>

                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              className={`w-10 h-10 font-semibold transition-all duration-200 ${
                                currentPage === page ? 'shadow-lg scale-110' : 'hover:scale-105'
                              }`}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="h-10 px-4 font-semibold"
                      >
                        {t('Next')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                {t('Upload Files')}
              </DialogTitle>
              <DialogDescription className="text-base">
                {t('Upload new files to your media library')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div
                className={`relative border-3 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-all duration-300 ${
                  dragActive ? 'scale-110' : ''
                }`}>
                  <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                    dragActive ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                  }`}>
                    <Upload className={`h-10 w-10 transition-all duration-300 ${
                      dragActive ? 'text-white animate-bounce' : 'text-primary'
                    }`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {dragActive ? '✨ ' + t('Drop files here') + ' ✨' : '📁 ' + t('Upload your files')}
                  </h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
                    {dragActive 
                      ? t('Release to upload your files')
                      : t('Drag and drop your files here, or click to browse')
                    }
                  </p>

                  <Input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload-modal"
                  />

                  {!uploading && (
                    <Button
                      type="button"
                      onClick={() => document.getElementById('file-upload-modal')?.click()}
                      size="lg"
                      className="h-12 px-8 text-base font-semibold shadow-lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      {t('Choose Files')}
                    </Button>
                  )}

                  {uploading && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary border-t-transparent"></div>
                        <span className="text-lg font-semibold text-primary">{t('Uploading...')}</span>
                      </div>
                      <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60 animate-pulse rounded-full" style={{width: '100%'}}></div>
                      </div>
                    </div>
                  )}
                </div>

                {dragActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl pointer-events-none" />
                )}
              </div>

              {/* File Type Info */}
              <div className="bg-muted/50 rounded-xl p-4 border">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium mb-1">{t('Supported file types')}</p>
                    <p className="text-muted-foreground leading-relaxed">
                      {t('Images, Documents, Videos, and more. Check storage settings for specific formats.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Modal */}
        <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Info className="h-6 w-6 text-primary" />
                </div>
                {t('File Information')}
              </DialogTitle>
              <DialogDescription className="text-base">
                {t('View detailed information about this file')}
              </DialogDescription>
            </DialogHeader>

            {selectedMediaInfo && (
              <div className="space-y-6">
                {/* File Preview */}
                <div className="flex justify-center bg-gradient-to-br from-muted/50 to-muted rounded-2xl p-6 border-2">
                  {selectedMediaInfo.mime_type.startsWith('image/') ? (
                    <img
                      src={selectedMediaInfo.thumb_url}
                      alt={selectedMediaInfo.name}
                      className="max-w-full h-64 object-contain rounded-xl shadow-2xl"
                      onError={(e) => {
                        e.currentTarget.src = selectedMediaInfo.url;
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 w-full">
                      <div className="mb-6 p-6 bg-background rounded-2xl shadow-lg">
                        <div className="text-7xl">
                          {getFileIcon(selectedMediaInfo.mime_type)}
                        </div>
                      </div>
                      <div className="text-base font-semibold text-muted-foreground">
                        {selectedMediaInfo.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </div>
                    </div>
                  )}
                </div>

                {/* File Details */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-4 bg-muted/30 rounded-xl p-5 border">
                    <div className="flex justify-between items-start py-2 border-b">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        {t('File Name')}
                      </span>
                      <span className="text-sm font-medium text-right max-w-xs truncate" title={selectedMediaInfo.file_name}>
                        {selectedMediaInfo.file_name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {t('File Type')}
                      </span>
                      <Badge variant="secondary" className="font-semibold">{selectedMediaInfo.mime_type}</Badge>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {t('File Size')}
                      </span>
                      <span className="text-sm font-medium">{formatFileSize(selectedMediaInfo.size)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {t('Uploaded')}
                      </span>
                      <span className="text-sm font-medium">{formatDate(selectedMediaInfo.created_at)}</span>
                    </div>
                  </div>

                  <div className="pt-2 bg-muted/30 rounded-xl p-5 border">
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      {t('URL')}
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                      <code className="text-xs text-muted-foreground flex-1 truncate font-mono">
                        {selectedMediaInfo.url}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(selectedMediaInfo.url)}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(selectedMediaInfo.url)}
                    className="flex-1 h-11"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('Copy Link')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedMediaInfo.url)}
                    className="flex-1 h-11"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('Download')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmationDialog
        open={deleteDirectoryState.isOpen}
        onOpenChange={(open) => setDeleteDirectoryState({isOpen: open, id: null, isLoading: false})}
        title={t('Delete Directory')}
        message={t('Are you sure you want to delete this directory?')}
        confirmText={t('Delete')}
        isLoading={deleteDirectoryState.isLoading}
        onConfirm={() => deleteDirectoryState.id && deleteDirectory(deleteDirectoryState.id)}
        variant="destructive"
      />
    </AuthenticatedLayout>
  );
}
