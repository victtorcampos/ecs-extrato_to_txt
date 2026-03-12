import { Pipe, PipeTransform } from '@angular/core';
import { LoteStatus } from '../../core/models/lote.model';

const LABELS: Record<string, string> = {
  aguardando:  'Aguardando',
  pendente:    'Pendente',
  processando: 'Processando',
  concluido:   'Concluído',
  erro:        'Erro',
};

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: LoteStatus | string | null | undefined): string {
    if (!value) return '';
    return LABELS[value] ?? value;
  }
}
