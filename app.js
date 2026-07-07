// ================================================================
// SUPABASE CONFIG
// ================================================================
const SUPABASE_URL      = 'https://ywxdwqlfvlesyweqkiky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eGR3cWxmdmxlc3l3ZXFraWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjgzNzgsImV4cCI6MjA5ODk0NDM3OH0.HEcfbfOdoEE0P2ZfyrwhywrSfJwAN97N3Zjw0x-utLs';

const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR_PROJECT');
let db = null;
console.log('[Supabase] CONFIGURED:', SUPABASE_CONFIGURED);
console.log('[Supabase] URL:', SUPABASE_URL);
if (SUPABASE_CONFIGURED) {
    try {
        const { createClient } = supabase;
        db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] Client created OK:', db);
    } catch (err) {
        console.error('[Supabase] Failed to create client:', err);
    }
} else {
    console.warn('[Supabase] Not configured — using localStorage fallback');
    document.getElementById('supabaseBanner').style.display = 'block';
}

// ================================================================
// STATE
// ================================================================
let productos       = [];
let carrito         = [];
let categorias      = [];
let categoriaActual = 'todos';
let modeloActual    = 'iphone11';
let usuarioAutenticado = false;
let productoEnEdicion  = null;
let pendingAction      = null;
let modelos            = [];

const CATEGORIAS_DEFAULT = ['fundas','protectores','correas','ventosas','airpods pro de segunda generación'];

const MODELOS = [
    {id:'iphone11',nombre:'iPhone 11'},{id:'iphone12',nombre:'iPhone 12'},
    {id:'iphone12mini',nombre:'iPhone 12 Mini'},{id:'iphone12pro',nombre:'iPhone 12 Pro'},
    {id:'iphone12promax',nombre:'iPhone 12 Pro Max'},{id:'iphone13',nombre:'iPhone 13'},
    {id:'iphone13mini',nombre:'iPhone 13 Mini'},{id:'iphone13pro',nombre:'iPhone 13 Pro'},
    {id:'iphone13promax',nombre:'iPhone 13 Pro Max'},{id:'iphone14',nombre:'iPhone 14'},
    {id:'iphone14plus',nombre:'iPhone 14 Plus'},{id:'iphone14pro',nombre:'iPhone 14 Pro'},
    {id:'iphone14promax',nombre:'iPhone 14 Pro Max'},{id:'iphone15',nombre:'iPhone 15'},
    {id:'iphone15plus',nombre:'iPhone 15 Plus'},{id:'iphone15pro',nombre:'iPhone 15 Pro'},
    {id:'iphone15promax',nombre:'iPhone 15 Pro Max'},{id:'iphone16',nombre:'iPhone 16'},
    {id:'iphone16plus',nombre:'iPhone 16 Plus'},{id:'iphone16pro',nombre:'iPhone 16 Pro'},
    {id:'iphone16promax',nombre:'iPhone 16 Pro Max'},{id:'iphone17',nombre:'iPhone 17'},
    {id:'iphone17plus',nombre:'iPhone 17 Plus'},{id:'iphone17pro',nombre:'iPhone 17 Pro'},
    {id:'iphone17promax',nombre:'iPhone 17 Pro Max'}
];

// ================================================================
// MOBILE MENU
// ================================================================
function toggleMobileMenu() {
    document.getElementById('hamburger').classList.toggle('open');
    document.getElementById('headerButtons').classList.toggle('open');
}
function cerrarMobileMenu() {
    document.getElementById('hamburger').classList.remove('open');
    document.getElementById('headerButtons').classList.remove('open');
}

// ================================================================
// DATA LAYER
// ================================================================
async function cargarDatos() {
    mostrarCargando(true);
    const carritoGuardado = localStorage.getItem('coverStoreCarrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);

    if (SUPABASE_CONFIGURED) {
        console.log('[cargarDatos] Fetching from Supabase...');
        try {
            const [{ data: cats, error: e1 }, { data: prods, error: e2 }, { data: mods, error: e3 }] = await Promise.all([
                db.from('categorias').select('nombre').order('nombre'),
                db.from('productos').select('*').order('created_at', { ascending: false }),
                db.from('modelos').select('id,nombre').order('nombre')
            ]);
            console.log('[cargarDatos] categorias response → data:', cats, 'error:', e1);
            console.log('[cargarDatos] productos response  → data:', prods, 'error:', e2);
            if (e1) throw e1;
            if (e2) throw e2;
            categorias = cats.map(c => c.nombre);
            productos  = prods;
            modelos    = (mods && mods.length) ? mods : [...MODELOS];
            if (e3) { console.warn('[cargarDatos] modelos table not found, using defaults'); modelos = [...MODELOS]; }
            if (!modelos.find(m => m.id === modeloActual) && modelos.length) modeloActual = modelos[0].id;
            console.log('[cargarDatos] Loaded', categorias.length, 'categorias,', productos.length, 'productos,', modelos.length, 'modelos');
        } catch (err) {
            console.error('[cargarDatos] Supabase error:', err);
            alert('Error al cargar datos: ' + err.message);
        }
    } else {
        const savedCats  = localStorage.getItem('coverStoreCategorias');
        const savedProds = localStorage.getItem('coverStoreProductos');
        categorias = savedCats  ? JSON.parse(savedCats)  : [...CATEGORIAS_DEFAULT];
        productos  = savedProds ? JSON.parse(savedProds) : [];
        modelos    = [...MODELOS];
    }

    actualizarBotonesCategoria();
    actualizarBotonesModelo();
    mostrarProductos();
    actualizarCarrito();
    mostrarCargando(false);
}

function guardarCarrito() { localStorage.setItem('coverStoreCarrito', JSON.stringify(carrito)); }

function guardarLocalStorage() {
    localStorage.setItem('coverStoreCategorias', JSON.stringify(categorias));
    localStorage.setItem('coverStoreProductos',  JSON.stringify(productos));
}

// ================================================================
// UI
// ================================================================
function mostrarCargando(show) {
    if (show) document.getElementById('productosGrid').innerHTML =
        '<div class="loading-wrapper"><div class="spinner"></div><p>Cargando productos...</p></div>';
}

function mostrarToast(msg, duracion = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    clearTimeout(t._timeout);
    t.classList.add('show');
    t._timeout = setTimeout(() => t.classList.remove('show'), duracion);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mostrarProductos() {
    const grid = document.getElementById('productosGrid');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const categoriasConModelo = ['fundas','protectores'];
    let lista = [...productos];

    if (categoriaActual !== 'todos') lista = lista.filter(p => p.categoria === categoriaActual);
    if (categoriasConModelo.includes(categoriaActual)) lista = lista.filter(p => p.modelo === modeloActual);
    if (searchTerm) lista = lista.filter(p => p.nombre.toLowerCase().includes(searchTerm));

    if (lista.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">No hay productos disponibles</p>';
        return;
    }

    grid.innerHTML = lista.map(p => `
        <div class="product-card">
            <div class="product-image">
                ${p.imagen_url ? `<img src="${escapeHtml(p.imagen_url)}" alt="${escapeHtml(p.nombre)}" loading="lazy">` : 'Sin imagen'}
            </div>
            <div class="product-info">
                <div class="product-name">${escapeHtml(p.nombre)}</div>
                <div class="product-details">
                    ${p.modelo ? 'Modelo: '+escapeHtml(p.modelo)+'<br>' : ''}
                    ${p.color  ? 'Color: ' +escapeHtml(p.color) +'<br>' : ''}
                </div>
                <div class="product-price">$${Number(p.precio).toLocaleString()}</div>
                <div class="product-actions">
                    <button class="btn-add" onclick="agregarAlCarrito(${p.id})">
                        🛒 Agregar al carrito
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function actualizarBotonesCategoria() {
    document.getElementById('categoriaButtons').innerHTML =
        `<button class="filter-btn ${categoriaActual==='todos'?'active':''}" onclick="filtrarPorCategoria('todos',this)">Todos</button>` +
        categorias.map(c =>
            `<button class="filter-btn ${categoriaActual===c?'active':''}" onclick="filtrarPorCategoria('${c}',this)">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`
        ).join('');
}

function actualizarBotonesModelo() {
    const sel = document.getElementById('modeloSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled>Selecciona tu modelo...</option>' +
        modelos.map(m =>
            `<option value="${m.id}" ${m.id===modeloActual?'selected':''}>${m.nombre}</option>`
        ).join('');
}

// ================================================================
// FILTERS
// ================================================================
function filtrarPorCategoria(cat, btn) {
    categoriaActual = cat;
    document.querySelectorAll('#categoriaButtons .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('modeloFilter').style.display = ['fundas','protectores'].includes(cat) ? 'block' : 'none';
    mostrarProductos();
}

function filtrarPorModelo(modelo) {
    modeloActual = modelo;
    mostrarProductos();
}

// ================================================================
// AUTH  — contraseña persiste por sesión (hasta recargar la página)
// ================================================================
function requireAuth(action, message='Ingresa la contraseña para continuar') {
    if (usuarioAutenticado) { action(); return; }
    pendingAction = action;
    document.getElementById('passwordMessage').textContent = message;
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').classList.remove('show');
    document.getElementById('modalPassword').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

function verificarPassword() {
    if (document.getElementById('passwordInput').value === '210608.j') {
        usuarioAutenticado = true;
        document.getElementById('modalPassword').classList.remove('active');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordError').classList.remove('show');
        if (pendingAction) {
            const fn = pendingAction; pendingAction = null;
            setTimeout(fn, 200);
        } else {
            document.getElementById('overlay').classList.remove('active');
        }
    } else {
        document.getElementById('passwordError').classList.add('show');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

function cerrarPassword() {
    document.getElementById('modalPassword').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').classList.remove('show');
    pendingAction = null;
}

// ================================================================
// PRODUCT FORM
// ================================================================
function abrirFormProducto(producto=null) {
    productoEnEdicion = producto;
    document.getElementById('modalTitulo').textContent = producto ? 'Editar Producto' : 'Agregar Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('imagenPreview').style.display = 'none';
    document.getElementById('imagenPreview').src = '';
    document.getElementById('productoImagenUrl').value = '';

    rellenarSelectCategoria();
    rellenarSelectModelo();

    if (producto) {
        document.getElementById('productoNombre').value    = producto.nombre    || '';
        document.getElementById('productoCategoria').value  = producto.categoria || '';
        document.getElementById('productoPrice').value     = producto.precio    || '';
        document.getElementById('productoStock').value     = producto.stock !== undefined ? producto.stock : '';
        document.getElementById('productoModelo').value    = producto.modelo    || '';
        document.getElementById('productoColor').value     = producto.color     || '';
        if (producto.imagen_url) {
            document.getElementById('imagenPreview').src = producto.imagen_url;
            document.getElementById('imagenPreview').style.display = 'block';
        }
        actualizarModeloSelect();
    }

    document.getElementById('btnSubmitProducto').textContent = 'Guardar Producto';
    document.getElementById('btnSubmitProducto').disabled = false;
    document.getElementById('modalAgregarProducto').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function rellenarSelectCategoria() {
    const sel = document.getElementById('productoCategoria');
    sel.innerHTML = '<option value="">Selecciona una categoría</option>' +
        categorias.map(c => `<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('');
    if (productoEnEdicion) sel.value = productoEnEdicion.categoria || '';
}

function rellenarSelectModelo() {
    const sel = document.getElementById('productoModelo');
    sel.innerHTML = '<option value="">Selecciona un modelo</option>' +
        modelos.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
    if (productoEnEdicion && productoEnEdicion.modelo) sel.value = productoEnEdicion.modelo;
}

function actualizarModeloSelect() {
    const cat = document.getElementById('productoCategoria').value;
    document.getElementById('modeloGroup').style.display = ['fundas','protectores'].includes(cat) ? 'block' : 'none';
    document.getElementById('colorGroup').style.display  = ['correas','ventosas'].includes(cat)   ? 'block' : 'none';
}

function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('productoImagenUrl').value = '';
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('imagenPreview').src = e.target.result;
        document.getElementById('imagenPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function onUrlChange(url) {
    document.getElementById('productoImagen').value = '';
    const prev = document.getElementById('imagenPreview');
    if (url) { prev.src = url; prev.style.display = 'block'; }
    else { prev.style.display = 'none'; }
}

async function guardarProducto(event) {
    event.preventDefault();
    if (!usuarioAutenticado) return;

    const btn = document.getElementById('btnSubmitProducto');
    btn.textContent = 'Guardando...'; btn.disabled = true;

    try {
        let imagenUrl = productoEnEdicion ? (productoEnEdicion.imagen_url || null) : null;

        const imagenFile     = document.getElementById('productoImagen').files[0];
        const imagenUrlInput = document.getElementById('productoImagenUrl').value.trim();

        if (imagenFile) {
            if (SUPABASE_CONFIGURED) {
                const ext = imagenFile.name.split('.').pop();
                const fileName = Date.now() + '.' + ext;
                const { data: up, error: upErr } = await db.storage
                    .from('product-images')
                    .upload(fileName, imagenFile, { cacheControl: '3600', upsert: false });
                if (!upErr) {
                    imagenUrl = db.storage.from('product-images').getPublicUrl(up.path).data.publicUrl;
                } else {
                    console.warn('Storage error:', upErr.message);
                    imagenUrl = await fileToBase64(imagenFile);
                }
            } else {
                imagenUrl = await fileToBase64(imagenFile);
            }
        } else if (imagenUrlInput) {
            imagenUrl = imagenUrlInput;
        }

        const payload = {
            nombre:     document.getElementById('productoNombre').value.trim(),
            categoria:  document.getElementById('productoCategoria').value,
            modelo:     document.getElementById('productoModelo').value  || null,
            color:      document.getElementById('productoColor').value.trim() || null,
            precio:     parseInt(document.getElementById('productoPrice').value),
            stock:      parseInt(document.getElementById('productoStock').value),
            imagen_url: imagenUrl
        };

        const esEdicion = !!productoEnEdicion;

        if (SUPABASE_CONFIGURED) {
            let err;
            if (esEdicion) {
                ({ error: err } = await db.from('productos').update(payload).eq('id', productoEnEdicion.id));
            } else {
                ({ error: err } = await db.from('productos').insert([payload]));
            }
            if (err) throw err;
            await cargarDatos();
        } else {
            if (esEdicion) {
                const idx = productos.findIndex(p => String(p.id) === String(productoEnEdicion.id));
                if (idx !== -1) productos[idx] = { ...payload, id: productoEnEdicion.id };
            } else {
                productos.push({ ...payload, id: Date.now() });
            }
            guardarLocalStorage();
            mostrarProductos();
        }

        productoEnEdicion = null;
        cerrarModal('modalAgregarProducto');
        if (document.getElementById('adminPage').classList.contains('active')) {
            mostrarProductosAdmin();
            mostrarStockAdmin();
        }
        mostrarToast(`✅ Producto ${esEdicion ? 'actualizado' : 'agregado'} exitosamente`);
    } catch (err) {
        console.error(err);
        alert('❌ Error al guardar: ' + err.message);
    } finally {
        btn.textContent = 'Guardar Producto'; btn.disabled = false;
    }
}

function solicitarEditarProducto(id) {
    requireAuth(() => {
        const p = productos.find(p => String(p.id) === String(id));
        if (p) abrirFormProducto(p);
    }, 'Ingresa la contraseña para editar el producto');
}

function solicitarEliminarProducto(id) {
    requireAuth(async () => {
        if (!confirm('¿Estás seguro de que querés eliminar este producto?')) return;
        try {
            if (SUPABASE_CONFIGURED) {
                const { error } = await db.from('productos').delete().eq('id', id);
                if (error) throw error;
                await cargarDatos();
            } else {
                productos = productos.filter(p => String(p.id) !== String(id));
                guardarLocalStorage();
                mostrarProductos();
            }
            mostrarProductosAdmin();
            mostrarStockAdmin();
            mostrarToast('✅ Producto eliminado');
        } catch (err) { alert('❌ Error: ' + err.message); }
    }, 'Ingresa la contraseña para eliminar el producto');
}

// ================================================================
// ADMIN — CATEGORIES
// ================================================================
function abrirAdmin() {
    mostrarProductosAdmin();
    mostrarCategoriasAdmin();
    mostrarModelosAdmin();
    mostrarStockAdmin();
    document.getElementById('adminPage').classList.add('active');
    window.scrollTo(0, 0);
}

function cerrarAdminPage() {
    document.getElementById('adminPage').classList.remove('active');
}

function mostrarProductosAdmin() {
    const lista = document.getElementById('adminProductosList');
    if (!lista) return;
    if (!productos.length) {
        lista.innerHTML = '<p style="color:#999;padding:10px;">No hay productos cargados</p>';
        return;
    }
    lista.innerHTML = productos.map(p => `
        <div class="admin-product-item">
            <div class="admin-product-info">
                <span class="admin-product-name">${escapeHtml(p.nombre)}</span>
                ${p.modelo ? `<em class="admin-product-meta">${escapeHtml(p.modelo)}</em>` : ''}
                <span class="admin-product-price">$${Number(p.precio).toLocaleString()}</span>
                <span class="admin-product-stock">Stock: ${p.stock}</span>
            </div>
            <div class="admin-product-actions">
                <button class="btn-admin-edit" data-id="${p.id}">✏️</button>
                <button class="btn-admin-delete" data-id="${p.id}">🗑️</button>
            </div>
        </div>
    `).join('');
    lista.onclick = e => {
        const editBtn = e.target.closest('.btn-admin-edit');
        const delBtn  = e.target.closest('.btn-admin-delete');
        if (editBtn) {
            const prod = productos.find(p => String(p.id) === String(editBtn.dataset.id));
            if (prod) abrirFormProducto(prod);
        }
        if (delBtn) solicitarEliminarProducto(delBtn.dataset.id);
    };
}

function mostrarCategoriasAdmin() {
    const lista = document.getElementById('categoriasList');
    lista.innerHTML = categorias.map(c => `
        <div class="category-item">
            <span>${c.charAt(0).toUpperCase()+c.slice(1)}</span>
            <button class="btn-remove-category" data-cat="${c}">Eliminar</button>
        </div>
    `).join('');
    lista.onclick = e => {
        const btn = e.target.closest('.btn-remove-category');
        if (btn) eliminarCategoria(btn.dataset.cat);
    };
}

async function agregarCategoria() {
    const input = document.getElementById('nuevaCategoria');
    const nombre = input.value.trim().toLowerCase();
    if (!nombre) { alert('Ingresa un nombre para la categoría'); return; }
    if (categorias.includes(nombre)) { alert('Esta categoría ya existe'); return; }
    try {
        if (SUPABASE_CONFIGURED) {
            const { error } = await db.from('categorias').insert([{ nombre }]);
            if (error) throw error;
            await cargarDatos();
        } else {
            categorias.push(nombre);
            guardarLocalStorage();
            actualizarBotonesCategoria();
        }
        mostrarCategoriasAdmin();
        input.value = '';
        alert('✅ Categoría agregada');
    } catch (err) { alert('❌ Error: ' + err.message); }
}

// ================================================================
// ADMIN — MODELOS
// ================================================================
function mostrarModelosAdmin() {
    const lista = document.getElementById('modelosList');
    if (!lista) return;
    lista.innerHTML = modelos.map(m => `
        <div class="category-item">
            <span>${escapeHtml(m.nombre)}</span>
            <button class="btn-remove-category" data-id="${escapeHtml(m.id)}">Eliminar</button>
        </div>
    `).join('') || '<p style="color:#999;padding:10px;">No hay modelos cargados</p>';
    lista.onclick = e => {
        const btn = e.target.closest('.btn-remove-category');
        if (btn) eliminarModelo(btn.dataset.id);
    };
}

async function agregarModelo() {
    const input = document.getElementById('nuevoModelo');
    const nombre = input.value.trim();
    if (!nombre) { alert('Ingresa el nombre del modelo'); return; }
    const id = nombre.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    if (modelos.some(m => m.id === id)) { alert('Este modelo ya existe'); return; }
    try {
        if (SUPABASE_CONFIGURED) {
            const { error } = await db.from('modelos').insert([{ id, nombre }]);
            if (error) throw error;
            await cargarDatos();
        } else {
            modelos.push({ id, nombre });
            actualizarBotonesModelo();
        }
        mostrarModelosAdmin();
        input.value = '';
        mostrarToast('✅ Modelo agregado');
    } catch (err) { alert('❌ Error: ' + err.message); }
}

async function eliminarModelo(id) {
    if (productos.some(p => p.modelo === id)) {
        alert('No podés eliminar este modelo porque tiene productos asociados.');
        return;
    }
    const m = modelos.find(m => m.id === id);
    if (!confirm(`¿Eliminar el modelo "${m ? m.nombre : id}"?`)) return;
    try {
        if (SUPABASE_CONFIGURED) {
            const { error } = await db.from('modelos').delete().eq('id', id);
            if (error) throw error;
            await cargarDatos();
        } else {
            modelos = modelos.filter(m => m.id !== id);
            actualizarBotonesModelo();
        }
        mostrarModelosAdmin();
        mostrarToast('✅ Modelo eliminado');
    } catch (err) { alert('❌ Error: ' + err.message); }
}

// ================================================================
// ADMIN — STOCK
// ================================================================
function mostrarStockAdmin() {
    const lista = document.getElementById('stockList');
    if (!lista) return;
    if (!productos.length) {
        lista.innerHTML = '<p style="color:#999;padding:10px;">No hay productos cargados</p>';
        return;
    }
    lista.innerHTML = productos.map(p => `
        <div class="stock-item">
            <span class="stock-name">${escapeHtml(p.nombre)}${p.modelo ? ' <em>('+escapeHtml(p.modelo)+')</em>' : ''}</span>
            <div class="stock-controls">
                <input type="number" min="0" class="stock-input" value="${p.stock}" id="stock_${p.id}">
                <button class="btn-update-stock" onclick="actualizarStock(${p.id})">Guardar</button>
            </div>
        </div>
    `).join('');
}

async function actualizarStock(id) {
    const input = document.getElementById('stock_' + id);
    const nuevoStock = parseInt(input.value);
    if (isNaN(nuevoStock) || nuevoStock < 0) { alert('Stock inválido'); return; }
    try {
        if (SUPABASE_CONFIGURED) {
            const { error } = await db.from('productos').update({ stock: nuevoStock }).eq('id', id);
            if (error) throw error;
        }
        const p = productos.find(p => String(p.id) === String(id));
        if (p) { p.stock = nuevoStock; if (!SUPABASE_CONFIGURED) guardarLocalStorage(); }
        mostrarProductos();
        mostrarToast('✅ Stock actualizado');
    } catch (err) { alert('❌ Error: ' + err.message); }
}

async function eliminarCategoria(nombre) {
    if (productos.some(p => p.categoria === nombre)) {
        alert('No podés eliminar esta categoría porque tiene productos asociados.');
        return;
    }
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
        if (SUPABASE_CONFIGURED) {
            const { error } = await db.from('categorias').delete().eq('nombre', nombre);
            if (error) throw error;
            await cargarDatos();
        } else {
            categorias = categorias.filter(c => c !== nombre);
            guardarLocalStorage();
            actualizarBotonesCategoria();
        }
        mostrarCategoriasAdmin();
        alert('✅ Categoría eliminada');
    } catch (err) { alert('❌ Error: ' + err.message); }
}

// ================================================================
// CART
// ================================================================
function agregarAlCarrito(id) {
    const producto = productos.find(p => String(p.id) === String(id));
    if (!producto) return;
    const item = carrito.find(i => String(i.id) === String(id));
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio,
            cantidad: 1, color: producto.color||null, modelo: producto.modelo||null });
    }
    guardarCarrito(); actualizarCarrito();
    mostrarToast('🛒 ¡' + producto.nombre + ' agregado al carrito!');
}

function cambiarCantidad(id, delta) {
    const item = carrito.find(i => String(i.id) === String(id));
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) eliminarDelCarrito(id);
    else { guardarCarrito(); actualizarCarrito(); }
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(i => String(i.id) !== String(id));
    guardarCarrito(); actualizarCarrito();
}

function actualizarCarrito() {
    const cartItems  = document.getElementById('cartItems');
    const cartCount  = document.getElementById('cartCount');
    const cartFooter = document.getElementById('cartFooter');

    if (!carrito.length) {
        cartItems.innerHTML = '<div class="empty-cart">Tu carrito está vacío</div>';
        cartFooter.style.display = 'none'; cartCount.style.display = 'none'; return;
    }

    cartCount.textContent = carrito.reduce((s,i) => s+i.cantidad, 0);
    cartCount.style.display = 'flex'; cartFooter.style.display = 'block';

    cartItems.innerHTML = carrito.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
            ${item.color  ? `<div class="cart-item-price">Color: ${escapeHtml(item.color)}</div>`   : ''}
            ${item.modelo ? `<div class="cart-item-price">Modelo: ${escapeHtml(item.modelo)}</div>` : ''}
            <div class="cart-item-price">$${Number(item.precio).toLocaleString()} c/u</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
                <button class="quantity-btn" onclick="cambiarCantidad(${item.id},-1)">−</button>
                <span style="font-weight:bold;">${item.cantidad}</span>
                <button class="quantity-btn" onclick="cambiarCantidad(${item.id},1)">+</button>
                <button class="quantity-btn" style="background-color:#ff6b6b;" onclick="eliminarDelCarrito(${item.id})">🗑️</button>
            </div>
            <div style="text-align:right;font-weight:bold;color:#1e5a7a;margin-top:6px;">$${(item.precio*item.cantidad).toLocaleString()}</div>
        </div>
    `).join('');

    document.getElementById('cartTotalPrice').textContent =
        '$' + carrito.reduce((s,i) => s+i.precio*i.cantidad, 0).toLocaleString();
}

function abrirCarrito()  { document.getElementById('cartSidebar').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function cerrarCarrito() { document.getElementById('cartSidebar').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); }

function cotizarPorWhatsApp() {
    if (!carrito.length) { alert('Tu carrito está vacío'); return; }
    let msg = 'Hola! Quisiera cotizar los siguientes productos de Cover Store:\n\n';
    let total = 0;
    carrito.forEach(i => {
        const sub = i.precio*i.cantidad; total += sub;
        msg += `- ${i.nombre}`;
        if (i.color)  msg += ` (${i.color})`;
        if (i.modelo) msg += ` - ${i.modelo}`;
        msg += ` x${i.cantidad} = $${sub.toLocaleString('es-AR')}\n`;
    });
    msg += `\nTotal aprox: $${total.toLocaleString('es-AR')}\n\nCual seria el precio final con envio?`;
    window.open(`https://wa.me/5493794861508?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================================================================
// CONTACT
// ================================================================
function abrirContacto()  { document.getElementById('modalContacto').classList.add('active');    document.getElementById('overlay').classList.add('active'); }
function cerrarContacto() { document.getElementById('modalContacto').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); }
function irWhatsApp()  { window.open('https://wa.me/5493794861508?text=Hola%20Cover%20Store%2C%20quisiera%20cotizar%20productos','_blank'); cerrarContacto(); }
function irInstagram() { window.open('https://www.instagram.com/coverstore.ok?igsh=MWNpbm16c2d3anF1cQ%3D%3D&utm_source=qr','_blank'); cerrarContacto(); }
function cotizarEspecial() {
    const msg = '¡Hola! 👋 Me interesa solicitar una funda para un modelo que no es iPhone. ¿Qué opciones tienen?';
    window.open(`https://wa.me/5493794861508?text=${encodeURIComponent(msg)}`,'_blank');
}

// ================================================================
// MODAL HELPERS
// ================================================================
function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}
function cerrarOverlay(event) {
    if (event.target.id !== 'overlay') return;
    document.querySelectorAll('.modal.active,.modal-contacto.active,.cart-sidebar.active').forEach(el => el.classList.remove('active'));
    document.getElementById('overlay').classList.remove('active');
}

// ================================================================
// UTILS
// ================================================================
function fileToBase64(file) {
    return new Promise((res,rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

// ================================================================
// INIT
// ================================================================
window.addEventListener('load', () => {
    cargarDatos();
    document.getElementById('nuevaCategoria').addEventListener('keypress', e => {
        if (e.key === 'Enter') { e.preventDefault(); agregarCategoria(); }
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('adminPage').classList.contains('active')) {
            cerrarAdminPage();
        }
    });
});
