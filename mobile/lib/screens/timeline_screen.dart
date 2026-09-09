import 'package:flutter/material.dart';
import '../services/api.dart';

class TimelineScreen extends StatefulWidget {
  final String roadName;
  const TimelineScreen({super.key, required this.roadName});
  @override State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  List posts = [];
  bool loading = true;

  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    setState(()=> loading=true);
    try { posts = await Api.fetchTimeline(widget.roadName); } catch (_) { posts=[]; }
    setState(()=> loading=false);
  }

  String freshness(String ts) {
    final m = DateTime.now().difference(DateTime.parse(ts)).inMinutes;
    if (m<1) return 'just now';
    if (m<60) return '${m}m ago';
    return '${(m/60).floor()}h ago';
  }

  @override Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.roadName)),
      body: loading ? const Center(child: CircularProgressIndicator()) : ListView.builder(
        itemCount: posts.length,
        itemBuilder: (_, i) {
          final p = posts[i];
          return ListTile(
            leading: CircleAvatar(backgroundColor: p['roadCondition']=='Not Passable'? Colors.red : p['roadCondition']=='Cleared'? Colors.green : Colors.orange, child: Text('${i+1}', style: const TextStyle(color: Colors.white, fontSize: 12))),
            title: Text('${p['roadCondition']} · ${p['severity']} · ${p['status']}'),
            subtitle: Text('${freshness(p['timestamp'])} · ${p['caption']??''}\n${p['aiReason']??''}', maxLines: 2),
            isThreeLine: true,
          );
        },
      ),
    );
  }
}
