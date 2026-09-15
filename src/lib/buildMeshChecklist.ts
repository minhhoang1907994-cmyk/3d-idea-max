import { DEFAULT_NOZZLE_MM } from '../data/speedPresets';
import type { MeshCheckItem, MixResult, Printer } from '../types';
import { minFeatureMm } from './buildPrompt';

/**
 * Checklist cho khâu ẢNH → STL → SLICER, tức phần nằm NGOÀI tầm với của prompt.
 *
 * Prompt chỉ quyết định được hình dạng trong ảnh. Những lỗi bên dưới phát sinh khi tool
 * image→3D dựng mesh (mặt hở/non-manifold, mesh rỗng kín, mật độ tam giác, tỉ lệ tuỳ ý)
 * — app không sửa được, chỉ nêu rõ để user tự kiểm trước khi bấm in.
 *
 * Quy tắc: chỉ nêu bước kiểm tra và dấu hiệu QUAN SÁT ĐƯỢC (dung lượng file, số đo,
 * cảnh báo của chính công cụ). Không đưa ngưỡng số mà app không có nguồn để khẳng định.
 */
export function buildMeshChecklist(mix: MixResult, printer: Printer): MeshCheckItem[] {
  const items: MeshCheckItem[] = [
    {
      id: 'repair-manifold',
      level: 'required',
      label: 'Chạy repair mesh trước khi làm bất cứ việc gì khác',
      risk:
        'Tool image→3D hay để lại mặt hở, mặt lật ngược hoặc cạnh dính nhau (non-manifold). ' +
        'Slicer đọc vào sẽ ra lát cắt sai hoặc bỏ trống mảng lớn.',
      tool: 'Microsoft 3D Builder, Meshmixer (Analysis → Inspector), hoặc Blender add-on 3D-Print Toolbox',
    },
    {
      id: 'set-scale',
      level: 'required',
      label: `Đặt lại kích thước về đúng ~${mix.size.longestEdgeMm} mm chiều dài lớn nhất`,
      risk:
        'Mesh dựng từ ảnh không mang đơn vị thật — nhập vào slicer thường ra vài milimét ' +
        'hoặc vài mét. Mọi thông số ở bảng bên chỉ đúng khi mô hình đã đúng tỉ lệ.',
      tool: 'Bambu Studio → chọn vật thể → Size',
    },
    {
      id: 'check-thickness',
      level: 'required',
      label: `Đo lại chỗ mảnh nhất, phải dày hơn ${minFeatureMm()} mm`,
      risk:
        `Mỏng hơn 2 vòng tường đầu phun mặc định (${DEFAULT_NOZZLE_MM} mm) của ${printer.label} ` +
        'thì slicer bỏ qua hẳn, ' +
        'hoặc in ra một lớp đơn gãy ngay khi gỡ support.',
      tool: 'Bambu Studio → Preview, hoặc Meshmixer → Analysis → Thickness',
    },
    {
      id: 'orient-base',
      level: 'required',
      label: 'Xoay cho mặt phẳng lớn nhất nằm xuống bàn in',
      risk:
        'Prompt đã yêu cầu đế phẳng, nhưng mesh xuất ra thường lệch trục. Đặt sai hướng ' +
        'làm diện tích bám bàn nhỏ lại, mô hình bong giữa chừng.',
      tool: 'Bambu Studio → Place on face',
    },
    {
      id: 'preview-overhang',
      level: 'required',
      label: 'Bật Preview kiểm vùng overhang rồi mới quyết định Support',
      risk:
        'Prompt ràng buộc overhang ≤45° nhưng Gemini không đảm bảo tuyệt đối. Vùng dốc ' +
        'còn sót mà không có support sẽ rủ xuống thành sợi nhựa rối.',
      tool: 'Bambu Studio → Preview → Overhang, tab Support',
    },
  ];

  if (mix.detail.layerHeightMm <= 0.12) {
    items.push({
      id: 'decimate',
      level: 'conditional',
      label: 'Giảm số tam giác nếu file nặng bất thường hoặc slicer chậm hẳn',
      risk:
        `Mức chi tiết "${mix.detail.label}" dễ khiến tool image→3D xuất mesh dày đặc. ` +
        'Slicer vẫn ra được g-code nhưng chậm, và phần lớn chi tiết đó nhỏ hơn đường phun nên in không thấy.',
      tool: 'Blender → Modifier Decimate, hoặc Meshmixer → Reduce',
    });
  }

  const longestBuildEdgeMm = Math.max(
    printer.buildVolumeMm.x,
    printer.buildVolumeMm.y,
    printer.buildVolumeMm.z,
  );
  if (mix.size.longestEdgeMm > longestBuildEdgeMm) {
    items.push({
      id: 'split-and-pin',
      level: 'conditional',
      label: `Cắt mô hình thành nhiều phần dưới ${longestBuildEdgeMm} mm, thêm chốt định vị rồi mới ghép`,
      risk:
        `Vật thể ~${mix.size.longestEdgeMm} mm vượt khổ in của ${printer.label}. Cắt tuỳ tiện ` +
        'thì hai nửa không có gì giữ đúng vị trí khi dán — sai vài độ ở mối ghép là lệch hẳn ' +
        'ở đầu kia. Cắt qua chỗ mảnh cũng làm mối ghép gãy ngay khi cầm.',
      tool:
        'Bambu Studio → Cut (bật Connectors, kiểu Pin/Dovetail) — chọn mặt cắt phẳng và dày, ' +
        'hoặc Meshmixer → Edit → Plane Cut rồi tự thêm chốt',
    });
  }

  items.push({
    id: 'drain-hole',
    level: 'conditional',
    label: 'Nếu mô hình rỗng kín thì khoét một lỗ thoát ở đáy',
    risk:
      'Khối rỗng hoàn toàn kín giam khí và nhựa thừa bên trong, dễ phồng mặt hoặc kẹt ' +
      'khi in. Slicer cũng không biết phải đổ infill vào đâu.',
    tool: 'Meshmixer → Edit → Hollow (có sẵn tuỳ chọn escape hole)',
  });

  return items;
}
