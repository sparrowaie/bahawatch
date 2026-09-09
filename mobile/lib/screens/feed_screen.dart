import 'package:flutter/material.dart';
import '../services/api.dart';
import 'detail_screen.dart';
import 'timeline_screen.dart';

class FeedScreen extends StatefulWidget { const FeedScreen({super.key}); @override State<FeedScreen> createState() => _FeedScreenState(); }

class _FeedScreenState extends State<FeedScreen> {
  List posts = []; bool loading = true;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(()=> loading=true);
    try { posts = await Api.fetchPosts(); } catch(e) { posts=[]; }
    setState(()=> loading=false);
  }
  String freshness(String ts) {
    final m = (DateTime.now().difference(DateTime.parse(ts)).inMinutes);
    if (m<1) return 'just now'; if (m<60) return '${m}m ago'; if (m<1440) return '${(m/60).floor()}h ago'; return '${(m/1440).floor()}d ago';
  }
  @override Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        itemCount: posts.length + 1,
        itemBuilder: (c,i) {
          if (i==0) return Padding(padding: const EdgeInsets.all(12), child: Text('BAHAWATCH Post Feed · ${posts.length} recent', style: Theme.of(context).textTheme.titleSmall));
          final p = posts[i-1];
          return InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DetailScreen(post: Map<String,dynamic>.from(p)))),
            child: Card(margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (p['photoUrl']!=null) Image.network('${const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000')}${p['photoUrl']}', height: 180, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_,__,___)=> const SizedBox(height:180, child: Center(child: Icon(Icons.image)))),
            Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing:6, children: [
                Chip(label: Text(p['status']??'', style: const TextStyle(fontSize:11)), visualDensity: VisualDensity.compact, backgroundColor: (p['status']=='AI-Flagged'? Colors.red.shade100 : p['status']=='Verified'? Colors.green.shade100 : Colors.grey.shade200)),
                Chip(label: Text(p['roadCondition']??'', style: const TextStyle(fontSize:11)), visualDensity: VisualDensity.compact),
                if (p['aiConfidence']!=null) Chip(label: Text('AI ${(p['aiConfidence']*100).round()}% ${p['aiSeverity']}', style: const TextStyle(fontSize:11)), visualDensity: VisualDensity.compact),
                Text(freshness(p['timestamp']), style: const TextStyle(fontSize:11, color: Colors.grey)),
              ]),
              const SizedBox(height:6),
              Text(p['roadName'] ?? '${p['lat']}, ${p['lng']}', style: const TextStyle(fontWeight: FontWeight.w600)),
              if (p['caption']!=null && (p['caption'] as String).isNotEmpty) Text(p['caption'], style: const TextStyle(fontSize:13)),
              Text('📍 ${p['lat']}, ${p['lng']} · ${p['geohash']??''}', style: const TextStyle(fontSize:11, color: Colors.grey)),
              if (p['aiReason']!=null) Text('AI: ${p['aiReason']}', style: const TextStyle(fontSize:11, color: Colors.blueGrey)),
              const SizedBox(height:4),
              TextButton(onPressed: ()=> Navigator.push(context, MaterialPageRoute(builder: (_)=> TimelineScreen(roadName: p['roadName'] ?? ''))), child: const Text('View timeline →', style: TextStyle(fontSize:12))),
            ])),
          ])));
        },
      ),
    );
  }
}
