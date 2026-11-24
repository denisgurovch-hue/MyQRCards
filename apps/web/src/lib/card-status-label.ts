/** Russian UI label for CardStatus (API keeps English enum values). */
export function cardStatusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Опубликовано';
    case 'draft':
      return 'Черновик';
    case 'archived':
      return 'Архив';
    default:
      return status;
  }
}
