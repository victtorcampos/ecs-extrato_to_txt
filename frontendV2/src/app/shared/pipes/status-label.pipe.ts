import { Pipe, PipeTransform } from '@angular/core';
import { LoteStatus } from '../../core/models/lote.model';

const LABELS: Record<LoteStatus, string> = {
  PENDENTE: 'Pendente',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  ERRO: 'Erro',
};

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: LoteStatus | string | null | undefined): string {
    if (!value) return '';
    return LABELS[value as LoteStatus] ?? value;
  }
}
