class PersonalGallery {
    constructor() {
        this.currentFilter = 'all';
        this.currentModalIndex = 0;
        this.mediaItems = [];
        this.filteredItems = [];
        
        this.initializeEventListeners();
        this.loadStoredMedia();
        this.scanLocalFolders(); // 페이지 로드 시 자동으로 폴더 스캔
        this.updateGallery();
    }

    async scanLocalFolders() {
        this.showLoading(true);
        
        try {
            // 기존 폴더 파일들 제거 (업로드된 파일은 유지)
            this.mediaItems = this.mediaItems.filter(item => !item.isFromFolder);
            
            // 알려진 파일들을 직접 추가
            const knownFiles = [
                { path: 'assets/video/video1-1.mp4', name: 'video1-1.mp4', type: 'video' }
            ];

            // 일반적인 파일 패턴들도 시도
            const commonPatterns = [
                // 비디오 파일들
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/video/video${i + 1}.mp4`, 
                    name: `video${i + 1}.mp4`, 
                    type: 'video'
                })),
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/video/sample${i + 1}.mp4`, 
                    name: `sample${i + 1}.mp4`, 
                    type: 'video'
                })),
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/video/test${i + 1}.mp4`, 
                    name: `test${i + 1}.mp4`, 
                    type: 'video'
                })),
                // 이미지 파일들
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/images/image${i + 1}.jpg`, 
                    name: `image${i + 1}.jpg`, 
                    type: 'image'
                })),
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/images/photo${i + 1}.jpg`, 
                    name: `photo${i + 1}.jpg`, 
                    type: 'image'
                })),
                ...Array.from({length: 10}, (_, i) => ({
                    path: `assets/images/sample${i + 1}.png`, 
                    name: `sample${i + 1}.png`, 
                    type: 'image'
                }))
            ];

            // 알려진 파일들부터 처리
            for (const file of knownFiles) {
                await this.addKnownFile(file);
            }

            // 일반적인 패턴들 시도
            for (const file of commonPatterns) {
                await this.addKnownFile(file);
            }
            
            this.saveMediaToStorage();
            this.updateGallery();
            
            if (this.mediaItems.filter(item => item.isFromFolder).length > 0) {
                console.log('폴더에서 파일을 찾았습니다!');
            } else {
                console.log('폴더에서 파일을 찾지 못했습니다. assets/images/ 또는 assets/video/ 폴더에 파일을 추가해주세요.');
            }
            
        } catch (error) {
            console.error('폴더 스캔 중 오류:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async addKnownFile(fileInfo) {
        try {
            // 파일이 실제로 존재하는지 확인
            const response = await fetch(fileInfo.path);
            if (!response.ok) {
                console.log(`파일을 찾을 수 없습니다: ${fileInfo.path}`);
                return;
            }

            const mediaItem = {
                id: 'folder_' + Date.now() + Math.random(),
                name: fileInfo.name,
                type: fileInfo.type,
                data: fileInfo.path, // 실제 파일 경로 사용
                size: 0, // 크기는 알 수 없음
                uploadDate: new Date().toISOString(),
                isFromFolder: true,
                folderPath: fileInfo.path,
                isDirectPath: true // 직접 경로임을 표시
            };

            // 중복 체크
            const exists = this.mediaItems.some(item => 
                item.folderPath === fileInfo.path || 
                (item.name === fileInfo.name && item.isFromFolder)
            );
            
            if (!exists) {
                this.mediaItems.push(mediaItem);
                console.log(`파일 추가됨: ${fileInfo.name}`);
            }
        } catch (error) {
            console.error(`파일 로드 실패: ${fileInfo.path}`, error);
        }
    }

    initializeEventListeners() {
        // 파일 업로드
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // 폴더 스캔
        const scanBtn = document.getElementById('scanFolders');
        scanBtn.addEventListener('click', () => this.scanLocalFolders());

        // 필터 버튼들
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // 모달 관련
        const modal = document.getElementById('modal');
        const modalClose = document.getElementById('modalClose');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const deleteBtn = document.getElementById('deleteBtn');

        modalClose.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        prevBtn.addEventListener('click', () => this.showPrevious());
        nextBtn.addEventListener('click', () => this.showNext());
        deleteBtn.addEventListener('click', () => this.deleteCurrentItem());

        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.showLoading(true);

        try {
            for (const file of files) {
                await this.processFile(file);
            }
            
            this.saveMediaToStorage();
            this.updateGallery();
        } catch (error) {
            console.error('파일 업로드 중 오류:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
            event.target.value = ''; // input 초기화
        }
    }

    async processFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                reject(new Error('지원하지 않는 파일 형식입니다.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaItem = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                    data: e.target.result,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                };

                this.mediaItems.push(mediaItem);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    handleFilterChange(event) {
        const filterType = event.target.dataset.filter;
        this.currentFilter = filterType;

        // 활성 버튼 업데이트
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        this.updateGallery();
    }

    updateGallery() {
        this.filterItems();
        this.renderGallery();
    }

    filterItems() {
        switch (this.currentFilter) {
            case 'images':
                this.filteredItems = this.mediaItems.filter(item => item.type === 'image');
                break;
            case 'videos':
                this.filteredItems = this.mediaItems.filter(item => item.type === 'video');
                break;
            default:
                this.filteredItems = [...this.mediaItems];
        }
    }

    renderGallery() {
        const gallery = document.getElementById('gallery');
        
        if (this.filteredItems.length === 0) {
            gallery.innerHTML = this.getEmptyGalleryHTML();
            return;
        }

        gallery.innerHTML = this.filteredItems.map((item, index) => 
            this.createGalleryItemHTML(item, index)
        ).join('');

        // 갤러리 아이템 클릭 이벤트 추가
        gallery.querySelectorAll('.gallery-item').forEach((item, index) => {
            item.addEventListener('click', () => this.openModal(index));
        });
    }

    createGalleryItemHTML(item, index) {
        const isVideo = item.type === 'video';
        const mediaPath = item.isDirectPath ? item.data : item.data;
        
        const mediaElement = isVideo 
            ? `<video src="${mediaPath}" muted preload="metadata"></video>`
            : `<img src="${mediaPath}" alt="${item.name}">`;

        const videoIndicator = isVideo 
            ? `<div class="video-indicator"><i class="fas fa-play"></i> 비디오</div>`
            : '';

        const folderIndicator = item.isFromFolder 
            ? `<div class="folder-indicator"><i class="fas fa-folder"></i></div>`
            : '';

        return `
            <div class="gallery-item" data-index="${index}">
                ${mediaElement}
                ${videoIndicator}
                ${folderIndicator}
                <div class="overlay">
                    <i class="fas ${isVideo ? 'fa-play' : 'fa-search-plus'}"></i>
                </div>
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                </div>
            </div>
        `;
    }

    getEmptyGalleryHTML() {
        const messages = {
            'all': '아직 업로드된 미디어가 없습니다.',
            'images': '아직 업로드된 이미지가 없습니다.',
            'videos': '아직 업로드된 비디오가 없습니다.'
        };

        return `
            <div class="empty-gallery">
                <i class="fas fa-folder-open"></i>
                <h3>갤러리가 비어있습니다</h3>
                <p>${messages[this.currentFilter]}</p>
            </div>
        `;
    }

    openModal(index) {
        this.currentModalIndex = index;
        const item = this.filteredItems[index];
        
        if (!item) return;

        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const mediaPath = item.isDirectPath ? item.data : item.data;

        if (item.type === 'video') {
            modalBody.innerHTML = `
                <video src="${mediaPath}" controls autoplay style="max-width: 100%; max-height: 100%;">
                    브라우저가 비디오를 지원하지 않습니다.
                </video>
            `;
        } else {
            modalBody.innerHTML = `
                <img src="${mediaPath}" alt="${item.name}" style="max-width: 100%; max-height: 100%;">
            `;
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        // 비디오가 있다면 정지
        const video = modalBody.querySelector('video');
        if (video) {
            video.pause();
        }

        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showPrevious() {
        if (this.filteredItems.length === 0) return;
        
        this.currentModalIndex = this.currentModalIndex > 0 
            ? this.currentModalIndex - 1 
            : this.filteredItems.length - 1;
        
        this.openModal(this.currentModalIndex);
    }

    showNext() {
        if (this.filteredItems.length === 0) return;
        
        this.currentModalIndex = this.currentModalIndex < this.filteredItems.length - 1 
            ? this.currentModalIndex + 1 
            : 0;
        
        this.openModal(this.currentModalIndex);
    }

    deleteCurrentItem() {
        if (this.filteredItems.length === 0) return;

        const confirmed = confirm('이 항목을 삭제하시겠습니까?');
        if (!confirmed) return;

        const itemToDelete = this.filteredItems[this.currentModalIndex];
        
        // 원본 배열에서 삭제
        this.mediaItems = this.mediaItems.filter(item => item.id !== itemToDelete.id);
        
        this.saveMediaToStorage();
        this.updateGallery();
        this.closeModal();
    }

    handleKeydown(event) {
        const modal = document.getElementById('modal');
        if (modal.style.display !== 'flex') return;

        switch (event.key) {
            case 'Escape':
                this.closeModal();
                break;
            case 'ArrowLeft':
                this.showPrevious();
                break;
            case 'ArrowRight':
                this.showNext();
                break;
            case 'Delete':
                this.deleteCurrentItem();
                break;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    saveMediaToStorage() {
        try {
            localStorage.setItem('personalGalleryMedia', JSON.stringify(this.mediaItems));
        } catch (error) {
            console.error('로컬 스토리지 저장 실패:', error);
            alert('저장 공간이 부족합니다. 일부 파일을 삭제해주세요.');
        }
    }

    loadStoredMedia() {
        try {
            const stored = localStorage.getItem('personalGalleryMedia');
            if (stored) {
                this.mediaItems = JSON.parse(stored);
            }
        } catch (error) {
            console.error('저장된 미디어 로드 실패:', error);
            this.mediaItems = [];
        }
    }

    // 유틸리티 메서드들
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStorageUsage() {
        const totalSize = this.mediaItems.reduce((total, item) => total + (item.size || 0), 0);
        return this.formatFileSize(totalSize);
    }

    exportGallery() {
        const data = {
            exportDate: new Date().toISOString(),
            items: this.mediaItems
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gallery-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    async importGallery(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.items && Array.isArray(data.items)) {
                        this.mediaItems = [...this.mediaItems, ...data.items];
                        this.saveMediaToStorage();
                        this.updateGallery();
                        resolve();
                    } else {
                        reject(new Error('잘못된 백업 파일 형식입니다.'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

// 페이지 로드 시 갤러리 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new PersonalGallery();
    
    // 개발자 도구용 유틸리티 함수들
    window.galleryUtils = {
        getStorageUsage: () => window.gallery.getStorageUsage(),
        exportGallery: () => window.gallery.exportGallery(),
        clearAll: () => {
            if (confirm('모든 데이터를 삭제하시겠습니까?')) {
                localStorage.removeItem('personalGalleryMedia');
                location.reload();
            }
        }
    };
});

// 드래그 앤 드롭 기능
document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.querySelector('.upload-box');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadBox.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadBox.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadBox.addEventListener(eventName, unhighlight, false);
    });

    uploadBox.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        uploadBox.classList.add('dragover');
    }

    function unhighlight(e) {
        uploadBox.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        const fileInput = document.getElementById('fileInput');
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

// 드래그 오버 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .upload-box.dragover {
        border: 2px dashed #667eea;
        background: rgba(102, 126, 234, 0.1);
        transform: scale(1.02);
    }
`;
document.head.appendChild(style);