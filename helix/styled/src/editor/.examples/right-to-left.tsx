export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-editor has the frame connect ProseMirror; on your page, connectEditor does. */}
      <div
        dir="rtl"
        lang="ar"
      >
        <helix-editor
          code-block-label="كتلة برمجية"
          data-preview-editor
          heading-label="عنوان {level}"
          label="ملاحظات الاجتماع"
          paragraph-label="فقرة"
        >
          <div data-prose="">
            <h2>ملاحظات الاجتماع</h2>
            <p>
              نطلق <strong>الإصدار الجديد</strong> يوم الخميس.
            </p>
            <ul>
              <li>
                <p>مراجعة التصميم</p>
              </li>
              <li>
                <p>تحديث الوثائق</p>
              </li>
            </ul>
            <p>Release notes go out in English first.</p>
          </div>
        </helix-editor>
      </div>
    </>
  )
}
