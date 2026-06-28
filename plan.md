# خطة تنفيذ CRUD كامل للوحة تحكم المدير

## الملفات المستهدفة

### الواجهة الأمامية (Admin Dashboard):
1. `admin-dashboard/src/pages/Tenants.jsx` — إعادة كتابة كاملة
2. `admin-dashboard/src/pages/Staff.jsx` — إعادة كتابة كاملة  
3. `admin-dashboard/src/pages/Bus.jsx` — إعادة كتابة كاملة
4. `admin-dashboard/src/pages/Villas.jsx` — إضافة زر تعديل + Edit Modal

### الواجهة الخلفية (Backend):
جميع الـ endpoints موجودة مسبقًا ولا تحتاج تعديل.

---

## 1. Tenants.jsx — المستأجرين (إضافة + تعديل + حذف + تابعين)

### الوضع الحالي:
- جدول عرض فقط
- لا يوجد إضافة/تعديل/حذف

### المطلوب:
- **إضافة مستأجر**: Modal مع full_name, email, phone, national_id, nationality, password, villa_id (dropdown), start_date, end_date, monthly_rent
- **تعديل**: زر تعديل لكل صف → Modal معبأ بالبيانات الحالية (PUT /api/tenants/:id)
- **حذف/تعطيل**: زر حذف مع تأكيد (تغيير الحالة إلى inactive)
- **عرض التابعين**: زر لكل مستأجر لعرض تابعينه (GET /api/tenants/:id/dependents) مع ability to add/remove
- **فلتر**: Dropdown للحالة (الكل/نشط/معطل)
- **Pagination**: بسيطة (أزرار الصفحات)

### API calls:
| العملية | API |
|---------|-----|
| عرض | GET /api/tenants?search=&status=&page=&limit= |
| إضافة | POST /api/tenants |
| تعديل | PUT /api/tenants/:id |
| حذف | DELETE /api/tenants/:id → نستخدم PUT لتغيير status |

---

## 2. Staff.jsx — فريق العمل (إضافة + تعديل + حذف)

### الوضع الحالي:
- عرض بطاقات فقط
- لا يوجد إضافة/تعديل/حذف

### المطلوب:
- تغيير من Card View إلى Table View (مثل Villas)
- **إضافة فرد**: Modal مع full_name, phone, email, password
- **تعديل**: زر تعديل → Modal معبأ (PUT /api/staff/:id)
- **حذف/تعطيل**: زر حذف مع تأكيد (DELETE /api/staff/:id)

### API calls:
| العملية | API |
|---------|-----|
| عرض | GET /api/staff |
| إضافة | POST /api/staff |
| تعديل | PUT /api/staff/:id |
| حذف | DELETE /api/staff/:id (soft delete → inactive) |

---

## 3. Bus.jsx — حافلات المدارس (إضافة + تعديل + إدارة المسارات)

### الوضع الحالي:
- عرض بطاقات للمسارات فقط
- لا يوجد إضافة/تعديل/حذف

### المطلوب:
- **إضافة مسار**: Modal مع route_name, driver_name, driver_phone, vehicle_plate, max_capacity, school_name
- **تعديل مسار**: زر تعديل → Modal معبأ (PUT /api/bus/routes/:id)
- **حذف مسار**: غير ضروري (الحذف موهوب بالبيانات)
- **عرض التسجيلات**: نافذة منبثقة تعرض الأطفال المسجلين في كل مسار
- **إضافة/إزالة تسجيل**: Modal إضافة تسجيل child + زر حذف تسجيل

### API calls:
| العملية | API |
|---------|-----|
| عرض المسارات | GET /api/bus |
| إضافة مسار | POST /api/bus/routes |
| تعديل مسار | PUT /api/bus/routes/:id |
| إضافة تسجيل | POST /api/bus/enroll? (لاحظ المسار مختلف) |
| حذف تسجيل | DELETE /api/bus/enrollments/:id |

ملاحظة: استدعاء enroll يحتاج إلى route_id, dependent_id, tenant_id, ولهذا نحتاج إلى جلب قائمة dependents للمستأجرين.

---

## 4. Villas.jsx — الفلل (إضافة تعديل)

### الوضع الحالي:
- إضافة ✅
- عرض ✅
- حذف ✅
- **تعديل ❌**

### المطلوب:
- زر تعديل لكل صف
- Modal تعديل معبأ بنفس حقول الإضافة (PUT /api/villas/:id)
- جلب بيانات الفيلا عند فتح التعديل (GET /api/villas/:id)

### API calls:
| العملية | API |
|---------|-----|
| تعديل | PUT /api/villas/:id |
| عرض فيلا واحدة | GET /api/villas/:id |

---

## خطة التنفيذ

1. **Villas.jsx** — أسهل تغيير (إضافة Edit Modal فقط) → نبدأ به
2. **Tenants.jsx** — الأكثر تعقيدًا → ننفذه ثانيًا 
3. **Staff.jsx** — مشابه لـ Villas → ثالثًا
4. **Bus.jsx** — بسيط → رابعًا

## التحقق

بعد التنفيذ، تأكد من:
- زر الإضافة يفتح Modal والـ form به الحقول المطلوبة
- زر التعديل يملأ Modal بالبيانات الحالية
- زر الحذف يظهر تأكيدًا قبل التنفيذ
- الفلترة/البحث تعمل بعد كل عملية CRUD
- الـ API calls تستخدم الرابط الصحيح (baseURL من api.js)
