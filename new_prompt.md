https://claude.ai/chat/02566132-286c-4e02-8a88-57b02111ea45


File yang tanggung : 
// src/controllers/adController.
j
adscontroller terhenti di script

    // Get ad analytics
    static async getAnalytics(req, res) {
        try {
            const { id } = req.params;
            const days = parseInt(req.query.days) || 30;
            
            const analytics = await Ad.getAnalytics(parseInt(id), days);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.
			
			
			
file yang belum
s
//views/index.ejs

