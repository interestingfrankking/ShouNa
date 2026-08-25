import api from '@/api'

// 同步物品照片：上传新增照片，删除被移除的照片
// 用于物品创建/编辑表单提交后，把表单里选择的图片真正上传到后端
export async function syncItemPhotos(itemId, photos, deletedPhotoIds) {
  // 上传新增的照片（isNew 且带有 file 对象）
  const newPhotos = (photos || []).filter(p => p.isNew && p.file)
  for (const photo of newPhotos) {
    const formData = new FormData()
    formData.append('photo', photo.file, photo.file.name || 'photo.jpg')
    await api.upload('/items/' + itemId + '/photos', formData)
  }

  // 删除被移除的已有照片
  const deletedIds = deletedPhotoIds || []
  for (const photoId of deletedIds) {
    await api.del('/photos/' + photoId)
  }
}
