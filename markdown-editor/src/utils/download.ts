/**
 * 使用 <a download> 下载文本内容。
 *
 * 在不支持 File System Access API 的浏览器（Firefox / Safari）上作为兜底。
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/markdown'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 给浏览器一些时间后释放
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
