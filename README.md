# 5 CỬA ẢI 1954 — AI CÒN TRỤ ĐẾN GIƠNEVƠ?

Trò chơi lịch sử chiếu trên lớp, thiết kế cho phần trình bày tối đa 15 phút với 3–4 phút chơi cuối bài. Chủ đề: từ thắng lợi Chiến dịch Điện Biên Phủ (7/5/1954) đến Hội nghị Giơnevơ — nghệ thuật kết hợp đấu tranh quân sự với đấu tranh ngoại giao của Đảng.

**Trò chơi cá nhân loại dần**: 5–15 bạn đứng tại chỗ, giơ thẻ A/B/C/D (hoặc 1–4 ngón). Người dẫn chiếu câu hỏi, khóa đáp án, công bố, chỉnh số người còn trụ bằng nút −/+ rồi bấm một nút sang câu kế. Sai ngồi xuống, đúng đi tiếp qua 5 cửa ải tăng dần độ khó.

- Không cần tài khoản, QR, backend, WebSocket hay điện thoại cho người chơi.
- Website tĩnh thuần HTML/CSS/JavaScript, chạy trực tiếp trên GitHub Pages.
- Toàn bộ nội dung, nút bấm và thông báo bằng tiếng Việt.

## Chơi ngay

Mở địa chỉ GitHub Pages của repository này (Settings → Pages), ví dụ: `https://<tên-tài-khoản>.github.io/<tên-repo>/`. Khuyến nghị Chrome/Edge, màn hình máy chiếu 16:9 (1366×768 hoặc 1920×1080).

## Hướng dẫn người dẫn (5 bước)

1. **Vào trang** — nhập số người tham gia (5–15), bấm **Bắt đầu** (tự requested toàn màn hình; nếu trình duyệt từ chối, nhấn F11). Đọc luật: *Sai ngồi xuống • Đúng đi tiếp • 5 câu tăng dần độ khó*.
2. **Mở cửa ải đầu tiên** — bản đồ 5 phong bì hiện lời chào hành trình; bấm **Mở cửa ải**. Từ câu 2 trở đi không quay lại bản đồ nữa: mỗi lần bấm nút chuyển tiếp là sang thẳng câu hỏi kế.
3. **Chiếu câu hỏi** — bấm **Bắt đầu đếm** (15–20 giây tùy câu, có thể **Tạm dừng/Tiếp tục**); hết giờ hệ thống **tự khóa**; hoặc bấm **Khóa đáp án** sớm hơn nếu cả lớp chọn xong.
4. **Công bố & chuyển câu** — bấm **Công bố đáp án**: đáp án đúng viền đỏ + dấu ✓, kèm giải thích và nguồn. Nhắc người sai ngồi xuống, bấm **−/+** ghi số người còn trụ (không bắt buộc, có thể bỏ qua), rồi bấm **Câu tiếp theo** — sang thẳng câu hỏi kế. Nhầm thì bấm **Hoàn tác** (góc trái trên, quay lại một bước).
5. **Kết thúc** — còn đúng 1 người sau câu 5: nhập tên (tùy chọn) → màn trao thưởng. Còn nhiều người: hệ thống tự vào **câu phụ phân thắng** (tối đa 2 câu, vẫn hòa thì hiển thị **Đồng chiến thắng**). Còn 0 người: mở **câu cứu trợ** cho nhóm vừa bị loại (chỉ một lần cả ván); không ai đúng thì kết thúc với phần quà khích lệ. Bấm **Chơi lại** để bắt đầu ván mới (có hộp xác nhận).

Phím tắt cho người dẫn: `Space` = mở cửa ải / bắt đầu đếm / tạm dừng–tiếp tục / công bố / sang câu tiếp theo; `L` = khóa đáp án.

## Nội dung học thuật

5 câu chính, 2 câu phụ phân thắng và 1 câu cứu trợ được xây dựng từ **Giáo trình Lịch sử Đảng Cộng sản Việt Nam (Ban Tuyên giáo Trung ương – Bộ GD&ĐT, 2019), PDF tr. 82–84**, giữ nguyên độ khó tăng dần: Khởi động → Nắm mốc → Hiểu chủ trương → Nối sự kiện → Tổng hợp. Phần giải thích là câu diễn ger theo giáo trình, không giả vờ là trích dẫn nguyên văn.

Thứ tự bốn phương án được xáo một lần đầu ván bằng Fisher–Yates; đáp án đúng được theo dõi bằng `correctOptionId` (id cố định), nên chữ A–D không ảnh hưởng đến tính đúng sai. Nạp lại trang giữa câu không đổi vị trí A–D.

## Đặc tả kỹ thuật

- **Máy trạng thái hữu hạn**: `setup → map → questionReady → counting → locked → revealed → (questionReady | tieBreaker | rescue | winner | finished)`, bảng chuyển trạng thái chặn các thao tác sai (công bố trước khóa, bấm liên tiếp gây bỏ câu…). Sau công bố chỉ có một nút chuyển tiếp — không có bước nhập số.
- **Undo**: stack tối đa 10 snapshot bất biến (câu hiện tại, trạng thái, survivors, trạng thái cứu trợ, thứ tự phương án, thời gian còn lại, người thắng) — không lưu DOM node.
- **Bộ đếm**: `performance.now()` + `requestAnimationFrame` (chỉ dùng để vẽ), pause/resume chính xác tới ms; rời tab tự tạm dừng; refresh (F5) khôi phục câu đang chơi ở trạng thái tạm dừng.
- **localStorage** có schema version + validate; nút Chơi lại xóa riêng dữ liệu ván. Tên người thắng được gán qua `textContent`, chống XSS.
- **Toàn màn hình**: gọi `requestFullscreen()` trong chính sự kiện click; nếu bị từ chối vẫn chơi bình thường, không chặn F11/Esc, có nút bật/tắt và cập nhật theo `fullscreenchange`.
- **Đáp ứng**: bố cục 16:9 phủ viewport, tự co giãn giữa 1920×1080 và 1366×768 (chữ đáp án không xuống dưới 22px); hỗ trợ `prefers-reduced-motion`; ảnh không tải được thì giao diện vẫn chơi được bằng màu nền CSS.

## Cấu trúc

```
index.html      — khung 5 màn hình + modal + toast
styles.css      — thiết kế "sách giáo khoa lịch sử vẽ tay", thang cỡ --u theo 16:9
app.js          — dữ liệu câu hỏi + FSM + undo + timer + lớp giao diện
assets/         — background_1954.png, envelope_sealed.png, winner_medal.png, fonts/
test/           — kiểm thử logic: node --test
```

## Chạy local & kiểm thử

```bash
# chạy local
python3 -m http.server 8080
# mở http://localhost:8080

# kiểm thử logic (Node 18+)
node --test
```

## Ghi nhận

- Nguồn nội dung: Giáo trình Lịch sử Đảng Cộng sản Việt Nam (2019), PDF tr. 82–84.
- Hình ảnh minh họa: do giáo viên cung cấp (nền watercolor 1954, phong bì niêm phong, huy chương lúa vàng).
- Dùng cho mục đích giảng dạy.
